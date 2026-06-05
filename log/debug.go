package log

func Debug(format string, args ...any) {
	debugColor.Printf("[DEBUG] "+format+"\n", args...)
}
