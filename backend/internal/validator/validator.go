// Package validator 提供請求資料驗證功能。
package validator

import (
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

// V 全域 validator 實例
var V *validator.Validate

func init() {
	V = validator.New(validator.WithRequiredStructEnabled())
}

// ValidationError 代表單一欄位驗證錯誤
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// Validate 驗證結構體，回傳人類可讀的錯誤訊息
func Validate(s any) []ValidationError {
	err := V.Struct(s)
	if err == nil {
		return nil
	}

	var errs []ValidationError
	for _, e := range err.(validator.ValidationErrors) {
		errs = append(errs, ValidationError{
			Field:   toJSONFieldName(e.Field()),
			Message: msgForTag(e),
		})
	}
	return errs
}

// toJSONFieldName 將 Go struct field name 轉為 camelCase JSON name
func toJSONFieldName(field string) string {
	if len(field) == 0 {
		return field
	}
	return strings.ToLower(field[:1]) + field[1:]
}

// msgForTag 根據驗證標籤產生人類可讀錯誤訊息
func msgForTag(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", toJSONFieldName(fe.Field()))
	case "email":
		return "must be a valid email address"
	case "min":
		return fmt.Sprintf("must be at least %s characters", fe.Param())
	case "max":
		return fmt.Sprintf("must be at most %s characters", fe.Param())
	case "gte":
		return fmt.Sprintf("must be at least %s", fe.Param())
	case "lte":
		return fmt.Sprintf("must be at most %s", fe.Param())
	case "oneof":
		return fmt.Sprintf("must be one of: %s", fe.Param())
	case "len":
		return fmt.Sprintf("must be exactly %s characters", fe.Param())
	default:
		return fmt.Sprintf("failed on '%s' validation", fe.Tag())
	}
}
