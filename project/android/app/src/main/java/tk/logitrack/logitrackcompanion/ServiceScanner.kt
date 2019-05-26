package tk.logitrack.logitrackcompanion

import android.content.Context
import android.util.Log
import de.mannodermaus.rxbonjour.BonjourEvent
import de.mannodermaus.rxbonjour.RxBonjour
import de.mannodermaus.rxbonjour.drivers.jmdns.JmDNSDriver
import de.mannodermaus.rxbonjour.platforms.android.AndroidPlatform
import io.reactivex.Emitter
import io.reactivex.Observable
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.disposables.Disposable
import io.reactivex.schedulers.Schedulers
import java.net.Inet4Address
import java.net.Inet6Address

class ServiceScanner(private val serviceName: String, serviceType: String, context: Context) {
    private val rxBonjour: RxBonjour
    private val rxDiscovery: Observable<BonjourEvent>
    private var disposable: Disposable? = null

    private lateinit var hostEmitter: Emitter<Host>
    private val hostObsersevable: Observable<Host> = Observable.create {
        hostEmitter = it
    }

    init {
        rxBonjour = RxBonjour.Builder().platform(AndroidPlatform.create(context)).driver(JmDNSDriver.create()).create()
        rxDiscovery = rxBonjour.newDiscovery(serviceType)
    }

    fun search() {
        if(disposable != null) {
            return
        }

        disposable = rxDiscovery
            .subscribeOn(Schedulers.io())
            .subscribe {
                event: BonjourEvent? -> when(event) {
                    is BonjourEvent.Added -> {
                        if(event.service.name.contains(serviceName)) {
                            val v4: Inet4Address? = event.service.v4Host

                            if (v4 != null) {
                                Log.d(javaClass.simpleName, "Tick")
                                hostEmitter.onNext(Host(v4.hostAddress, event.service.port))
                            }
                        }
                    }
                }
            }
    }

    fun hasStarted(): Boolean {
        return this.disposable != null
    }

    fun stop() {
        if(disposable != null) {
            disposable!!.dispose()
            disposable = null
        }
    }

    fun observe(): Observable<Host> {
        return hostObsersevable.observeOn(Schedulers.io())
    }

    data class Host(val ip: String, val port: Int)
}
