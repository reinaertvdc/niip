package tk.logitrack.logitrackcompanion

import android.content.Context
import android.util.Log
import de.mannodermaus.rxbonjour.BonjourEvent
import de.mannodermaus.rxbonjour.RxBonjour
import de.mannodermaus.rxbonjour.drivers.jmdns.JmDNSDriver
import de.mannodermaus.rxbonjour.platforms.android.AndroidPlatform
import io.reactivex.Observable
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.disposables.Disposable
import io.reactivex.schedulers.Schedulers
import java.net.Inet4Address
import java.net.Inet6Address

typealias Listener = (host: String, port: Int) -> Unit

class ServiceScanner(private val serviceName: String, serviceType: String, context: Context) {
    private val rxBonjour: RxBonjour
    private val rxDiscovery: Observable<BonjourEvent>
    private var disposable: Disposable? = null

    init {
        rxBonjour = RxBonjour.Builder().platform(AndroidPlatform.create(context)).driver(JmDNSDriver.create()).create()
        rxDiscovery = rxBonjour.newDiscovery(serviceType)
        rxDiscovery
            .subscribeOn(Schedulers.io())
            .observeOn(AndroidSchedulers.mainThread())

    }

    fun search(listener: Listener) {
	    if(disposable != null) {
			stop()
	    }

        disposable = rxDiscovery
            .subscribe {
                event: BonjourEvent? -> when(event) {
                    is BonjourEvent.Added -> {
                        if(event.service.name.contains(serviceName)) {
                            val v4: Inet4Address? = event.service.v4Host
                            val v6: Inet6Address? = event.service.v6Host

                            if (v4 != null) {
                                listener.invoke(v4.hostAddress, event.service.port)
                            }
                            if (v4 == null && v6 != null) {
                                //listener.invoke("[${v6.hostAddress}]", event.service.port)
                            }
                        }
                    }
                }
            }
    }

    fun stop() {
        if(disposable != null) {
            disposable!!.dispose()
            disposable = null
        }
    }
}
