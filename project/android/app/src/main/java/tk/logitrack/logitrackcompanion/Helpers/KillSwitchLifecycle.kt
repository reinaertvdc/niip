package tk.logitrack.logitrackcompanion.Helpers

import com.tinder.scarlet.Lifecycle
import com.tinder.scarlet.lifecycle.LifecycleRegistry
import io.reactivex.Emitter
import io.reactivex.Observable

class KillSwitchLifecycle private constructor(private val lifecycleRegistry: LifecycleRegistry): Lifecycle by lifecycleRegistry {
	private var killed = false
	private lateinit var emitter: Emitter<Boolean>

	private val killSwitch = Observable.create<Boolean> {
		it.onNext(killed)
		emitter = it
	}

	constructor(): this(LifecycleRegistry()) {

	}

	init {
		killSwitch
			.map {
				when(it) {
					false -> Lifecycle.State.Started
					true -> Lifecycle.State.Stopped.AndAborted
				}
			}
			.subscribe {
				lifecycleRegistry.onNext(it)
			}
	}

	fun kill() {
		emitter.onNext(true)
	}
}