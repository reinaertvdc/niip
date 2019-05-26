package tk.logitrack.logitrackcompanion.Services

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkInfo
import android.net.wifi.WifiManager
import android.util.Log
import io.reactivex.Emitter
import io.reactivex.Observable

object WiFiListener: BroadcastReceiver() {
	private lateinit var emitter: Emitter<String>
	private val observable: Observable<String> = Observable.create {
		emitter = it
	}

	init {
		Log.d(javaClass.simpleName, "Init")
	}

	override fun onReceive(context: Context?, intent: Intent?) {
		if(intent != null && context != null) {
			if(intent.action.equals(WifiManager.NETWORK_STATE_CHANGED_ACTION)) {
				android.os.Handler().postDelayed(
					{
						getCurrentSSID(context)
					},
					1000
				)
			}
		}
	}

	fun getCurrentSSID(context: Context) {
		var ssid: String = "None"

		val wifiManager = context.getSystemService(Context.WIFI_SERVICE) as WifiManager
		val connectionInfo = wifiManager.connectionInfo
		if (connectionInfo != null && connectionInfo.ssid.isNotEmpty()) {
			ssid = connectionInfo.ssid
			ssid = ssid.removeRange(0, 1)
			ssid = ssid.removeRange(ssid.length - 1, ssid.length)
		}


		emit(ssid)
	}

	private fun emit(value: String) {
		if(::emitter.isInitialized) {
			emitter.onNext(value)
		}
	}

	fun observe(): Observable<String> {
		return observable
	}
}