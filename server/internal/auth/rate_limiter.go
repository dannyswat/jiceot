package auth

import "time"

// RateLimiter uses token bucket algorithm to limit the number of requests per minute.
type RateLimiter struct {
	LimitPerMinute  int
	RefillPerMinute int
	tokenBuckets    map[string]int
}

func NewRateLimiter(limitPerMinute, refillPerMinute int) *RateLimiter {
	rl := &RateLimiter{
		LimitPerMinute:  limitPerMinute,
		RefillPerMinute: refillPerMinute,
		tokenBuckets:    make(map[string]int),
	}
	rl.Setup()
	return rl
}

func (rl *RateLimiter) AllowRequest(key string) bool {
	if _, exists := rl.tokenBuckets[key]; !exists {
		rl.tokenBuckets[key] = rl.LimitPerMinute
	}

	if rl.tokenBuckets[key] > 0 {
		rl.tokenBuckets[key]--
		return true
	}
	return false
}

func (rl *RateLimiter) refillTokens() {
	for key := range rl.tokenBuckets {
		rl.tokenBuckets[key] += rl.RefillPerMinute
		if rl.tokenBuckets[key] >= rl.LimitPerMinute {
			delete(rl.tokenBuckets, key) // Reset if it exceeds limit
		}
	}
}

func (rl *RateLimiter) Setup() {
	go func() {
		for {
			rl.refillTokens()
			time.Sleep(time.Minute)
		}
	}()
}
