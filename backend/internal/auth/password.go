// Package auth 處理認證與授權相關功能。
// 此檔案負責密碼雜湊與驗證。
package auth

import (
	"fmt"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"
)

// bcryptCost 定義 bcrypt 雜湊的計算成本
const bcryptCost = 10

// HashPassword 將明文密碼轉換為 bcrypt 雜湊值
// bcrypt 硬限制為 72 bytes，此處同時檢查 rune 下限與 byte 上限
func HashPassword(password string) (string, error) {
	runeLen := utf8.RuneCountInString(password)
	if runeLen < 8 {
		return "", fmt.Errorf("密碼長度必須為 8-72 個字元")
	}
	if len(password) > 72 {
		return "", fmt.Errorf("密碼長度不可超過 72 bytes（中文字每字佔 3 bytes）")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("hashing password: %w", err)
	}
	return string(hash), nil
}

// VerifyPassword 驗證明文密碼是否與雜湊值匹配
func VerifyPassword(password, hash string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
