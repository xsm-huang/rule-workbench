import { ApiFieldError } from '@rule-workbench/contracts';
import { ValidationError } from 'class-validator';

/** 把校验问题转换成自定义异常 */
export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ApiFieldError[] {
  return errors.flatMap((error) => {
    // 如果有父路径，拼接 父路径.当前字段名
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    // error.constraints 是 class-validator 当前字段的校验规则与错误信息
    const currentErrors = Object.values(error.constraints ?? {}).map(
      (message) => ({ path, message }),
    );

    const childErrors = flattenValidationErrors(error.children ?? [], path);

    return [...currentErrors, ...childErrors];
  });
}
