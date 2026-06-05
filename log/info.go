package log

import (
	"fmt"
	"time"

	"github.com/fatih/color"
)

var (
	timestampColor = color.New(color.FgHiBlack)
	errorColor     = color.New(color.FgHiRed)
	debugColor     = color.New(color.FgHiRed, color.Bold)
)

func timestamp() string {
	return time.Now().Format("15:04:05")
}

func Info(message string) {
	fmt.Printf("%s %s\n", timestampColor.Sprintf("[%s]", timestamp()), message)
}

func Infof(format string, args ...any) {
	Info(fmt.Sprintf(format, args...))
}
