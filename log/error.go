package log

import (
	"fmt"

	"github.com/fatih/color"
)

func Error(err error) {
	errorColor.Fprintf(color.Error, "[%s] %s\n", timestamp(), err.Error())
}

func Errorf(format string, args ...any) {
	Error(fmt.Errorf(format, args...))
}
