package tk.logitrack.logitrackcompanion.Fragments

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.disposables.Disposable
import kotlinx.android.synthetic.main.fragment_obd.*
import tk.logitrack.logitrackcompanion.LogiTrack.*
import tk.logitrack.logitrackcompanion.R

class OBDFragment(): LongLifeFragment() {
	private var stream_uuid: String? = null

	private lateinit var stream_disp: Disposable
	private lateinit var start_disp: Disposable

	private var connectionOpen = false
	private var isActive = false

	init {
		NodeAPI.observeWebSocket()
			.subscribe {
				when(it) {
					NodeAPI.Event.Initialized -> onInitialized()
					NodeAPI.Event.Connected -> onConnected()
					NodeAPI.Event.Disconnected -> onDisconnected()
				}

			}

		Log.d(javaClass.simpleName, "Init")
	}

	override fun onCreateView(
		inflater: LayoutInflater, container: ViewGroup?,
		savedInstanceState: Bundle?
	): View? {
		// Inflate the layout for this fragment
		return inflater.inflate(R.layout.fragment_obd, container, false)
	}

	override fun onFragmentActive() {
		isActive = true

		start()
	}

	override fun onFragmentNonActive() {
		isActive = false

		if(stream_uuid != null)
			NodeAPI.api.sendStopDataStream(StopDataStream(stream_uuid!!))

		stream_uuid = null
	}

	private fun start() {
		if(this.connectionOpen) {
			val sources: List<String> = mutableListOf("pid-12-readable", "pid-13-readable")
			NodeAPI.api.sendStartDataStream(StartDataStream(sources, 1000))
		}
	}

	fun onInitialized() {
		connectionOpen = true
		startStartListener()
		startTickListener()

		if(isActive) {
			start()
		}
	}

	fun onConnected() {
		connectionOpen = true
		startStartListener()
		startTickListener()

		if(isActive) {
			start()
		}
	}

	fun onDisconnected() {
		if(::stream_disp.isInitialized)
			stream_disp.dispose()
		if(::start_disp.isInitialized)
			start_disp.dispose()

		connectionOpen = false
		this.connectionOpen = false
		this.stream_uuid = null
	}

	private fun startStartListener() {
		start_disp = NodeAPI.observeStartDataStream().observeOn(AndroidSchedulers.mainThread()).subscribe ({ reply: StandardReply ->
			stream_uuid = reply.data.get("uuid") as String
			Log.d(javaClass.simpleName, "New uuid: " + reply.data.get("uuid") as String)
		}, { error ->
			Log.d("OBD", error.toString())
		})
	}

	private fun startTickListener() {
		stream_disp = NodeAPI.observeDataStreamTick().observeOn(AndroidSchedulers.mainThread()).subscribe ({ reply: StandardReply ->
			val uuid: String = reply.data.get("uuid") as String
			Log.d(javaClass.simpleName, "Message from: ${uuid}")
			if(stream_uuid!!.compareTo(uuid) == 0) {
				onDataTick(reply.data)
			}
		}, { error ->
			Log.d(javaClass.simpleName, "Error on tick: " + error.toString())
		})
	}

	private fun onDataTick(data: MutableMap<String, Any>) {
		if(data.containsKey("pid-12-readable")) {
			var rpm: String = data.get("pid-12-readable") as String
			rpm = rpm.removeRange(rpm.length - 3, rpm.length)
			obd_rpm_progress.setCurrentValues(rpm.toFloat())
			obd_rpm_text.text = rpm
		}

		if(data.containsKey("pid-13-readable")) {
			var speed: String = data.get("pid-13-readable") as String
			speed = speed.removeRange(speed.length - 4, speed.length)
			obd_speed_progress.setCurrentValues(speed.toFloat())
			obd_speed_text.text = speed
		}
	}

	companion object {
		@JvmStatic
		fun newInstance() =
			OBDFragment().apply {
				arguments = Bundle().apply {
				}
			}
	}
}
