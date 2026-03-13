package validator_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/raymondchen/ly-backend/internal/validator"
)

type testStruct struct {
	Email    string  `json:"email" validate:"required,email"`
	Password string  `json:"password" validate:"required,min=6"`
	Name     *string `json:"name" validate:"omitempty,max=100"`
}

func TestValidate_ValidInput(t *testing.T) {
	s := testStruct{Email: "test@example.com", Password: "password123"}
	errs := validator.Validate(s)
	assert.Nil(t, errs)
}

func TestValidate_MissingRequired(t *testing.T) {
	s := testStruct{}
	errs := validator.Validate(s)
	assert.NotNil(t, errs)
	assert.GreaterOrEqual(t, len(errs), 2, "should report email and password errors")
}

func TestValidate_InvalidEmail(t *testing.T) {
	s := testStruct{Email: "not-an-email", Password: "password123"}
	errs := validator.Validate(s)
	assert.NotNil(t, errs)
	assert.Equal(t, "email", errs[0].Field)
	assert.Contains(t, errs[0].Message, "email")
}

func TestValidate_PasswordTooShort(t *testing.T) {
	s := testStruct{Email: "test@example.com", Password: "abc"}
	errs := validator.Validate(s)
	assert.NotNil(t, errs)
	assert.Equal(t, "password", errs[0].Field)
	assert.Contains(t, errs[0].Message, "6")
}

func TestValidate_OptionalFieldEmpty(t *testing.T) {
	s := testStruct{Email: "test@example.com", Password: "password123", Name: nil}
	errs := validator.Validate(s)
	assert.Nil(t, errs, "nil optional field should pass")
}
