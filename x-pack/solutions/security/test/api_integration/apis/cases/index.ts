/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createUsersAndRoles,
  deleteUsersAndRoles,
} from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/authentication';

import { loginUsers } from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/api/user_profiles';
import {
  casesAllUser,
  obsCasesAllUser,
  secAllUser,
  users,
} from '@kbn/test-suites-xpack-platform/api_integration/apis/cases/common/users';
import { roles } from '@kbn/test-suites-xpack-platform/api_integration/apis/cases/common/roles';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  describe('cases', function () {
    const supertestWithoutAuth = getService('supertestWithoutAuth');

    before(async () => {
      await createUsersAndRoles(getService, users, roles);
      await loginUsers({
        supertest: supertestWithoutAuth,
        users: [casesAllUser, secAllUser, obsCasesAllUser],
      });
    });

    after(async () => {
      await deleteUsersAndRoles(getService, users, roles);
    });

    loadTestFile(require.resolve('./privileges'));
    loadTestFile(require.resolve('./suggest_user_profiles'));
    loadTestFile(require.resolve('./bulk_get_user_profiles'));
  });
}
