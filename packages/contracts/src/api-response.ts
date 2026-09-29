/** 通用错误编码 */
export const COMMON_API_ERROR_CODES = {
  /** 请求参数未通过 DTO 或 Schema 校验。 */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** 通用的错误请求，例如格式不正确。 */
  BAD_REQUEST: "BAD_REQUEST",
  /** 用户尚未登录或登录凭证无效。 */
  UNAUTHORIZED: "UNAUTHORIZED",
  /** 用户已登录，但没有执行该操作的权限。 */
  FORBIDDEN: "FORBIDDEN",
  /** 请求的业务资源不存在。 */
  NOT_FOUND: "NOT_FOUND",
  /** 当前操作与资源状态冲突，例如并发修改。 */
  CONFLICT: "CONFLICT",
  /** 未预期的服务端异常；不向客户端暴露内部细节。 */
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
} as const;

/** 从对象自动推导类型，获取所有值的联合类型
 * `as const` 的作用是让每个值保持为具体字符串,而不是被 TypeScript 放宽成普通的 string。
 */
export type CommonApiErrorCode =
  (typeof COMMON_API_ERROR_CODES)[keyof typeof COMMON_API_ERROR_CODES];

/** 单个字段的校验失败信息 */
export interface ApiFieldError {
  /** 出错字段的路径。 */
  path: string;
  /** 可展示给用户的字段错误说明。 */
  message: string;
}

/**
 * 所有失败响应中的 error 对象。
 * TCode 允许业务模块传入更精确的错误码类型；
 * 默认 string 表示可以兼容未来新增的业务错误码。
 */
export interface ApiError<TCode extends string = string> {
  /** 供前端程序判断的稳定错误码。 */
  code: TCode;
  message: string;
  /** 可选的字段级校验错误，仅表单或参数校验场景需要。 */
  fieldErrors?: ApiFieldError[];
}
/**
 * 失败响应。
 * success 固定为 false，是 TypeScript 用来识别失败分支的标记。
 */
export interface ApiErrorResponse<TCode extends string = string> {
  success: false;
  /** 结构化错误信息。 */
  error: ApiError<TCode>;
  /** 与服务端日志对应的请求关联 ID。 */
  requestId: string;
}

/**
 * 成功响应。
 * success 固定为 true，是 TypeScript 用来识别成功分支的标记
 * T 表示具体接口返回的数据类型。
 */
export interface ApiSuccessResponse<T> {
  success: true;
  /** 接口实际业务数据。 */
  data: T;
  /** 服务端为本次请求生成的唯一关联 ID。 */
  requestId: string;
}

export type ApiResponse<T, TCode extends string = string> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse<TCode>;
