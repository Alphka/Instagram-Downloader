package download

import "context"

// Queue limits the number of goroutines that can execute concurrently. It is
// implemented as a buffered channel used as a semaphore, which is the idiomatic
// Go approach and replaces the manual Set/Map bookkeeping in the original
// Queue.js.
//
// Usage:
//
//	queue := NewQueue(12)
//	err := queue.Run(func() error {
//	    return downloadFile(url)
//	})
type Queue struct {
	semaphore chan struct{}
}

func NewQueue(concurrency int) *Queue {
	return &Queue{semaphore: make(chan struct{}, concurrency)}
}

// Run acquires a slot, calls work(), releases the slot, and returns any error
// returned by work. The caller blocks until a slot is available, which
// naturally applies back-pressure without an explicit worker pool.
func (queue *Queue) Run(ctx context.Context, work func() error) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case queue.semaphore <- struct{}{}:
		defer func() { <-queue.semaphore }()
		return work()
	}
}
