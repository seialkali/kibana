/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlStartTrainedModelDeploymentRequest } from '@elastic/elasticsearch/lib/api/types';
import type { NLPSettings } from '../../../common/constants/app';
import type { TrainedModelDeploymentStatsResponse } from '../../../common/types/trained_models';
import type { CloudInfo } from '../services/ml_server_info';
import type { MlServerLimits } from '../../../common/types/ml_server_info';
import type { AdaptiveAllocations } from '../../../server/lib/ml_client/types';
import type { DeploymentParamsUI } from './deployment_setup';
import type { StartAllocationParams } from '../services/ml_api_service/trained_models';

export type MlStartTrainedModelDeploymentRequestNew = MlStartTrainedModelDeploymentRequest &
  AdaptiveAllocations;

/** Maximum allowed number of threads per allocation */
const MAX_NUMBER_OF_THREADS = 16;

type VCPUBreakpoints = Record<
  DeploymentParamsUI['vCPUUsage'],
  {
    min: number;
    max: number;
    /**
     * Static value is used for the number of vCPUs when the adaptive resources are disabled.
     * Not allowed in certain environments, Obs and Security serverless projects.
     */
    static?: number;
    maxThreads?: number;
  }
>;

type BreakpointValues = VCPUBreakpoints[keyof VCPUBreakpoints];

/**
 * Class responsible for mapping deployment params between API and UI
 */
export class DeploymentParamsMapper {
  private readonly threadingParamsValues: number[];

  /**
   * vCPUs level breakpoints for cloud cluster with enabled ML autoscaling.
   * TODO resolve dynamically when Control Pane exposes the vCPUs range.
   */
  private readonly autoscalingVCPUBreakpoints: VCPUBreakpoints;

  /**
   * vCPUs level breakpoints based on the ML server limits.
   * Either on-prem or cloud with disabled ML autoscaling.
   */
  private readonly hardwareVCPUBreakpoints: VCPUBreakpoints;

  /**
   * Result vCPUs level breakpoint based on the cluster env.
   */
  private readonly vCpuBreakpoints: VCPUBreakpoints;

  /**
   * Gets the min allowed number of allocations.
   * - 0 for serverless and ESS with enabled autoscaling.
   * - 1 otherwise
   * @internal
   */
  private get minAllowedNumberOfAllocation(): number {
    return this.cloudInfo.isMlAutoscalingEnabled ? 0 : 1;
  }

  constructor(
    private readonly mlServerLimits: MlServerLimits,
    private readonly cloudInfo: CloudInfo,
    private readonly nlpSettings?: NLPSettings
  ) {
    this.autoscalingVCPUBreakpoints = {
      low: { min: this.minAllowedNumberOfAllocation, max: 2, static: 2 },
      medium: { min: 1, max: 32, static: 32 },
      high: { min: 1, max: 99999, static: 128 },
    };

    /**
     * Initial value can be different for serverless and ESS with autoscaling.
     * Also not available with 0 ML active nodes.
     */
    const maxSingleMlNodeProcessors = this.mlServerLimits.max_single_ml_node_processors;

    let maxNumberOfThreads = MAX_NUMBER_OF_THREADS;
    if (this.nlpSettings?.modelDeployment) {
      maxNumberOfThreads = Math.max(
        ...Object.values(this.nlpSettings.modelDeployment.vCPURange).map((v) => v.maxThreads)
      );
    }

    this.threadingParamsValues = Array.from(
      /** To allow maximum number of threads to be 2^THREADS_MAX_EXPONENT */
      {
        length: Math.floor(Math.log2(maxNumberOfThreads)) + 1,
      },
      (_, i) => 2 ** i
    ).filter(maxSingleMlNodeProcessors ? (v) => v <= maxSingleMlNodeProcessors : () => true);

    const mediumValue = this.mlServerLimits!.total_ml_processors! / 2;

    this.hardwareVCPUBreakpoints = {
      low: { min: this.minAllowedNumberOfAllocation, max: 2, static: 2 },
      medium: { min: Math.min(3, mediumValue), max: mediumValue, static: mediumValue },
      high: {
        min: mediumValue + 1,
        max: this.mlServerLimits!.total_ml_processors!,
        static: this.mlServerLimits!.total_ml_processors!,
      },
    };

    if (this.nlpSettings?.modelDeployment) {
      // Apply project specific overrides
      this.vCpuBreakpoints = this.nlpSettings.modelDeployment.vCPURange;
    } else if (this.cloudInfo.isMlAutoscalingEnabled) {
      this.vCpuBreakpoints = this.autoscalingVCPUBreakpoints;
    } else {
      this.vCpuBreakpoints = this.hardwareVCPUBreakpoints;
    }
  }

  private getNumberOfThreads(input: DeploymentParamsUI): number {
    // 1 thread for ingest-optimized deployments
    if (input.optimized === 'optimizedForIngest') {
      return 1;
    }

    if (this.nlpSettings?.modelDeployment) {
      return this.nlpSettings.modelDeployment.vCPURange[input.vCPUUsage]?.maxThreads!;
    }

    // low → 2 threads, otherwise use the maximum
    return input.vCPUUsage === 'low' ? 2 : Math.max(...this.threadingParamsValues);
  }

  /**
   * Returns allocation values accounting for the number of threads per allocation.
   * @param params
   * @internal
   */
  private getAllocationsParams(
    params: DeploymentParamsUI
  ): Pick<MlStartTrainedModelDeploymentRequestNew, 'number_of_allocations'> &
    Pick<
      Exclude<MlStartTrainedModelDeploymentRequestNew['adaptive_allocations'], undefined>,
      'min_number_of_allocations' | 'max_number_of_allocations'
    > {
    const threadsPerAllocation = this.getNumberOfThreads(params);
    const { min: minVcpu, max: maxVcpu } = this.vCpuBreakpoints[params.vCPUUsage];

    // Maximum allocations is always the upper vCPU limit divided by threads per allocation.
    const maxAllocations = Math.floor(maxVcpu / threadsPerAllocation) || 1;

    // Minimum allocations depends on environment.
    const minAllocations = this.nlpSettings?.modelDeployment
      ? // Serverless / project-specific range comes straight from config.
        this.nlpSettings.modelDeployment.vCPURange[params.vCPUUsage].min
      : // Otherwise derive from break-points and fall back to defaults.
        Math.floor(minVcpu / threadsPerAllocation) ||
        (params.vCPUUsage === 'low' ? this.minAllowedNumberOfAllocation : 1);

    return {
      number_of_allocations: maxAllocations,
      min_number_of_allocations: minAllocations,
      max_number_of_allocations: maxAllocations,
    };
  }

  /**
   * Gets vCPU (virtual CPU) range based on the vCPU usage level
   * @param vCPUUsage
   * @returns
   */
  public getVCPURange(vCPUUsage: DeploymentParamsUI['vCPUUsage']) {
    return this.vCpuBreakpoints[vCPUUsage];
  }

  /**
   * Gets VCU (Virtual Compute Units) range based on the vCPU usage level
   * @param vCPUUsage
   * @returns
   */
  public getVCURange(vCPUUsage: DeploymentParamsUI['vCPUUsage']) {
    const vCPUBreakpoints = this.vCpuBreakpoints[vCPUUsage];

    // We need only min / max / static in VCUs, ignore any other props
    const allowedKeys: Array<keyof BreakpointValues> = ['min', 'max', 'static'];

    const result = {} as Partial<BreakpointValues>;

    for (const key of allowedKeys) {
      const cpuValue = vCPUBreakpoints[key];
      if (cpuValue !== undefined) {
        // As we can't retrieve Search project configuration, assume vector-optimized instances
        result[key] = Math.round(cpuValue / 0.125);
      }
    }

    return result as BreakpointValues;
  }

  /**
   * Maps UI params to the actual start deployment API request
   * @param input
   */
  public mapUiToApiDeploymentParams(
    modelId: string,
    input: DeploymentParamsUI
  ): StartAllocationParams {
    const resultInput: DeploymentParamsUI = Object.create(input);
    if (this.nlpSettings?.modelDeployment?.allowStaticAllocations === false) {
      // Enforce adaptive resources for serverless projects with prohibited static allocations
      resultInput.adaptiveResources = true;
    }

    const allocationParams = this.getAllocationsParams(resultInput);

    return {
      modelId,
      deploymentParams: {
        deployment_id: resultInput.deploymentId,
        threads_per_allocation: this.getNumberOfThreads(resultInput),
        priority: 'normal',
        ...(!resultInput.adaptiveResources && {
          number_of_allocations: allocationParams.number_of_allocations,
        }),
      },
      ...(resultInput.adaptiveResources && {
        adaptiveAllocationsParams: {
          enabled: true,
          min_number_of_allocations: allocationParams.min_number_of_allocations,
          max_number_of_allocations: allocationParams.max_number_of_allocations,
        },
      }),
    };
  }

  /**
   * Maps deployment params from API to the UI
   * @param input
   */
  public mapApiToUiDeploymentParams(
    input: MlTrainedModelAssignmentTaskParametersAdaptive
  ): DeploymentParamsUI {
    let optimized: DeploymentParamsUI['optimized'] = 'optimizedForIngest';
    if (input.threads_per_allocation && input.threads_per_allocation > 1) {
      optimized = 'optimizedForSearch';
    }
    const adaptiveResources = !!input.adaptive_allocations?.enabled;

    const vCPUs =
      (input.threads_per_allocation ?? 0) *
      (adaptiveResources
        ? input.adaptive_allocations!.max_number_of_allocations!
        : input.number_of_allocations ?? 0);

    // The deployment can be created via API with a number of allocations that do not exactly match our vCPU ranges.
    // In this case, we should find the closest vCPU range that does not exceed the max or static value of the range.
    const [vCPUUsage] = Object.entries(this.vCpuBreakpoints)
      .filter(([, range]) => vCPUs <= (adaptiveResources ? range.max : range.static!))
      .reduce(
        (prev, curr) => {
          const prevValue = adaptiveResources ? prev[1].max : prev[1].static!;
          const currValue = adaptiveResources ? curr[1].max : curr[1].static!;
          return Math.abs(vCPUs - prevValue) <= Math.abs(vCPUs - currValue) ? prev : curr;
        },
        // in case allocation params exceed the max value of the high range
        ['high', this.vCpuBreakpoints.high]
      );

    return {
      deploymentId: input.deployment_id,
      optimized,
      adaptiveResources,
      vCPUUsage: vCPUUsage as DeploymentParamsUI['vCPUUsage'],
    };
  }
}

export type MlTrainedModelAssignmentTaskParametersAdaptive = TrainedModelDeploymentStatsResponse &
  AdaptiveAllocations;
