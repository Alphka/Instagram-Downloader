package validate

import "testing"

func TestUsernameValidation(t *testing.T) {
	t.Run("should fail with invalid usernames", func(t *testing.T) {
		invalid := []struct {
			username string
			reason   string
		}{
			{"instagram-", "hyphens are not allowed"},
			{"instagram/", "slashes are not allowed"},
			{"@instagram", "symbols are not allowed"},
			{"instagram ", "trailing spaces are not allowed"},
			{" instagram", "leading spaces are not allowed"},
			{"instagram.", "trailing dots are not allowed"},
			{".instagram", "leading dots are not allowed"},
			{"instagr..am", "two or more consecutive dots are not allowed"},
			{"instagr...am", "three or more consecutive dots are not allowed"},
			{"instagraaaaaaaaaaaaaaaaaaaaaaam", "length > 30 characters is invalid"},
			{"_", "a single underscore is invalid (all underscores)"},
			{"___", "all underscores is invalid"},
		}

		for _, testCase := range invalid {
			if err := ValidateUsername(testCase.username); err == nil {
				t.Errorf("ValidateUsername(%q) should have failed: %s", testCase.username, testCase.reason)
			}
		}
	})

	t.Run("should pass with valid usernames", func(t *testing.T) {
		valid := []string{
			"instagram",
			"instagram_",
			"_instagram",
			"instagram.23",
			"a",
			"user.name",
			"user_name_123",
		}

		for _, username := range valid {
			if err := ValidateUsername(username); err != nil {
				t.Errorf("ValidateUsername(%q) should have passed but got: %v", username, err)
			}
		}
	})
}
