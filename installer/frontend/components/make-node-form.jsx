import _ from 'lodash';

import { getIamRoles } from '../aws-actions';
import {
  AWS_REGION_FORM,
  IAM_ROLE,
  IAM_ROLE_CREATE_OPTION,
  INSTANCE_TYPE,
  NUMBER_OF_INSTANCES,
  STORAGE_IOPS,
  STORAGE_SIZE_IN_GIB,
  STORAGE_TYPE,
} from '../cluster-config';

import { Field, Form } from '../form';
import { validate } from '../validate';

export const toId = (name, field) => `${name}-${field}`;

// Use this single dummy form / field to trigger loading the IAM roles list. Then IAM role fields can set this as their
// dependency, which avoids triggering a separate API request for each field.
new Form('DUMMY_NODE_FORM', [
  new Field(IAM_ROLE, {
    default: 'DUMMY_VALUE',
    name: IAM_ROLE,
    dependencies: [AWS_REGION_FORM],
    getExtraStuff: (dispatch, isNow) => dispatch(getIamRoles(null, null, isNow)),
  }),
]);

export const makeNodeForm = (name, instanceValidator, withIamRole = true, opts) => {
  const storageTypeId = toId(name, STORAGE_TYPE);

  // all fields must have a unique name!
  const fields = [
    new Field(toId(name, NUMBER_OF_INSTANCES), {
      validator: instanceValidator,
      default: 3,
      name: NUMBER_OF_INSTANCES,
    }),
    new Field(toId(name, INSTANCE_TYPE), {
      validator: validate.nonEmpty,
      default: 't2.medium',
      name: INSTANCE_TYPE,
    }),
    new Field(toId(name, STORAGE_SIZE_IN_GIB), {
      validator: validate.int({min: 30, max: 15999}),
      default: 30,
      name: STORAGE_SIZE_IN_GIB,
    }),
    new Field(storageTypeId, {
      validator: validate.nonEmpty,
      default: 'gp2',
      name: STORAGE_TYPE,
    }),
    new Field(toId(name, STORAGE_IOPS), {
      validator: validate.int({min: 100, max: 20000}),
      default: 1000,
      name: STORAGE_IOPS,
      dependencies: [storageTypeId],
      ignoreWhen: cc => cc[storageTypeId] !== 'io1',
    }),
  ];

  if (withIamRole) {
    fields.unshift(new Field(toId(name, IAM_ROLE), {
      default: IAM_ROLE_CREATE_OPTION,
      name: IAM_ROLE,
      dependencies: [IAM_ROLE],
    }));
  }

  const validator = (data) => {
    const type = data[STORAGE_TYPE];
    const maxIops = 50 * data[STORAGE_SIZE_IN_GIB];
    const ops = data[STORAGE_IOPS];

    if (type === 'io1' && ops > maxIops) {
      return `IOPS can't be larger than ${maxIops} (50 IOPS/GiB)`;
    }
  };

  return new Form(name, fields, _.defaults({validator}, opts));
};
