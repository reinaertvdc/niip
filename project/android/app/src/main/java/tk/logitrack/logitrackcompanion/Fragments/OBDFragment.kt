package tk.logitrack.logitrackcompanion.Fragments

import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.fragment.app.Fragment
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.tinder.scarlet.WebSocket
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.disposables.Disposable
import kotlinx.android.synthetic.main.fragment_obd.*
import tk.logitrack.logitrackcompanion.LogiTrack.NodeAPI
import tk.logitrack.logitrackcompanion.LogiTrack.StandardReply
import tk.logitrack.logitrackcompanion.LogiTrack.StartDataStream

import tk.logitrack.logitrackcompanion.R

// TODO: Rename parameter arguments, choose names that match
/**
 * A simple [Fragment] subclass.
 * Activities that contain this fragment must implement the
 * [OBDFragment.OnFragmentInteractionListener] interface
 * to handle interaction events.
 * Use the [OBDFragment.newInstance] factory method to
 * create an instance of this fragment.
 *
 */
class OBDFragment : Fragment() {
	private var listener: WizardFragmentListener? = null
	private var stream_uuid: String? = null
	private var stream_disp: Disposable? = null
	private var start_disp: Disposable? = null
	private var connect_disp: Disposable? = null

	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
	}

	override fun onCreateView(
		inflater: LayoutInflater, container: ViewGroup?,
		savedInstanceState: Bundle?
	): View? {
		// Inflate the layout for this fragment
		return inflater.inflate(R.layout.fragment_obd, container, false)
	}

	// TODO: Rename method, update argument and hook method into UI event
	fun onButtonPressed(uri: Uri) {
	}

	override fun onAttach(context: Context) {
		super.onAttach(context)
	}

	fun start() {
		if(NodeAPI.isInitialized()) {
			Log.d("OBD", "Init")
			onWebSocketConnected()
		}
		else {
			Log.d("OBD", "Not Init")
		}
	}

	override fun onDetach() {
		super.onDetach()

		if(connect_disp != null) {
			connect_disp!!.dispose()
			connect_disp = null
		}

		if(start_disp != null) {
			start_disp!!.dispose()
			start_disp = null
		}

		if(stream_disp != null) {
			stream_disp!!.dispose()
			stream_disp = null
		}
	}

	fun onWebSocketConnected() {
		//connect_disp!!.dispose()
		//connect_disp = null

		Log.d("OBD", "SocketConnected")
		val sources: List<String> = mutableListOf("pid-12", "pid-13")
		NodeAPI.api.sendStartDataStream(StartDataStream(sources, 1000))

		start_disp = NodeAPI.api.observeStartDataStream().subscribe ({
			reply: StandardReply ->
				Log.d("OBD", "DataStreamStart")
				stream_uuid = reply.data.get("uuid") as String

				onStartDataStream()
		}, {
			error ->
				Log.d("OBD", error.toString())
		})
	}

	fun onStartDataStream() {
		Log.d("OBD", "Start DataStream")
		start_disp!!.dispose()
		start_disp = null

		stream_disp = NodeAPI.api.observeDataStreamTick().observeOn(AndroidSchedulers.mainThread()).subscribe ({
			reply: StandardReply ->
				val uuid: String = reply.data.get("uuid") as String
				if(stream_uuid!!.compareTo(uuid) == 0) {
					onDataTick(reply.data)
				}
		}, { error ->
			Log.d("OBD", "Error on tick: " + error.toString())
		})
	}

	fun onDataTick(data: MutableMap<String, Any>) {
		Log.d("OBD", "Data Tick")

		if(data.containsKey("pid-12")) {
			var rpm: String = data.get("pid-12") as String
			rpm = rpm.removeRange(rpm.length - 3, rpm.length)
			obd_rpm_progress.setCurrentValues(rpm.toFloat())
			obd_rpm_text.text = rpm
		}

		if(data.containsKey("pid-13")) {
			var speed: String = data.get("pid-13") as String
			speed = speed.removeRange(speed.length - 4, speed.length)
			obd_speed_progress.setCurrentValues(speed.toFloat())
			obd_speed_text.text = speed
		}
	}

	companion object {
		/**
		 * Use this factory method to create a new instance of
		 * this fragment using the provided parameters.
		 *
		 * @param param1 Parameter 1.
		 * @param param2 Parameter 2.
		 * @return A new instance of fragment OBDFragment.
		 */
		// TODO: Rename and change types and number of parameters
		@JvmStatic
		fun newInstance(param1: String, param2: String) =
			OBDFragment().apply {
				arguments = Bundle().apply {
				}
			}
	}
}
