package validate

import "testing"

func TestSanitizeFilename(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"normal", "normal"},
		{"foo/bar", "foo_bar"},
		{"foo\\bar", "foo_bar"},
		{"foo:bar", "foo_bar"},
		{"foo*bar", "foo_bar"},
		{"foo?bar", "foo_bar"},
		{`foo"bar`, "foo_bar"},
		{"foo<bar", "foo_bar"},
		{"foo>bar", "foo_bar"},
		{"foo|bar", "foo_bar"},
		{"foo///bar", "foo___bar"},
		{".leading", "leading"},
		{"trailing.", "trailing"},
		{"CON", "_CON"},
		{"NUL.txt", "_NUL.txt"},
		{"normal.jpg", "normal.jpg"},
	}

	for _, testCase := range cases {
		result := SanitizeFilename(testCase.input)
		if result != testCase.expected {
			t.Errorf("SanitizeFilename(%q) = %q, want %q", testCase.input, result, testCase.expected)
		}
	}
}

func TestURLFilename(t *testing.T) {
	cases := []struct {
		rawURL   string
		expected string
	}{
		{"https://example.com/path/to/file.jpg", "file.jpg"},
		{"https://example.com/path/to/file.jpg?se=123&sp=r", "file.jpg"},
		{"https://example.com/path/", "path"},
		{"https://scontent.cdninstagram.com/v/t51.2885-15/12345_n.jpg?efg=abc", "12345_n.jpg"},
	}

	for _, testCase := range cases {
		result, err := URLFilename(testCase.rawURL)
		if err != nil {
			t.Errorf("URLFilename(%q) returned error: %v", testCase.rawURL, err)
			continue
		}

		if result != testCase.expected {
			t.Errorf("URLFilename(%q) = %q, want %q", testCase.rawURL, result, testCase.expected)
		}
	}
}
