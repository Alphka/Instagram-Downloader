package validate

import "fmt"

func ValidateUsername(username string) error {
	length := len(username)

	if length == 0 {
		return fmt.Errorf("invalid username %q: cannot be empty", username)
	}

	if length > 30 {
		return fmt.Errorf("invalid username %q: must be 30 characters or fewer", username)
	}

	if username[0] == '.' || username[length-1] == '.' {
		return fmt.Errorf("invalid username %q: cannot start or end with a dot", username)
	}

	allUnderscores := true

	for index, character := range username {
		if (character >= 'a' && character <= 'z') || (character >= 'A' && character <= 'Z') || (character >= '0' && character <= '9') {
			allUnderscores = false
			continue
		}

		if character == '_' {
			continue
		}

		if character == '.' {
			allUnderscores = false

			if index > 0 && username[index-1] == '.' {
				return fmt.Errorf("invalid username %q: consecutive dots are not allowed", username)
			}

			continue
		}

		return fmt.Errorf("invalid username %q: only letters, numbers, underscores, and dots are allowed", username)
	}

	if allUnderscores {
		return fmt.Errorf("invalid username %q: cannot consist entirely of underscores", username)
	}

	return nil
}
