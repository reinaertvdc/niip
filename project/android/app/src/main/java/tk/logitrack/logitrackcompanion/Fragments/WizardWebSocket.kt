package tk.logitrack.logitrackcompanion.Fragments

import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.fragment.app.Fragment
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.CheckBox
import com.tinder.scarlet.WebSocket
import tk.logitrack.logitrackcompanion.LogiTrack.NodeAPI

import tk.logitrack.logitrackcompanion.R
import tk.logitrack.logitrackcompanion.ServiceScanner


/**
 * A simple [Fragment] subclass.
 * Activities that contain this fragment must implement the
 * [WizardWebSocket.OnFragmentInteractionListener] interface
 * to handle interaction events.
 * Use the [WizardWebSocket.newInstance] factory method to
 * create an instance of this fragment.
 *
 */
class WizardWebSocket : Fragment() {
	private var listener: WizardFragmentListener? = null

	private lateinit var deviceFound: CheckBox
	private lateinit var socketConnected: CheckBox

	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
	}

	override fun onCreateView(
		inflater: LayoutInflater, container: ViewGroup?,
		savedInstanceState: Bundle?
	): View? {
		// Inflate the layout for this fragment
		return inflater.inflate(R.layout.fragment_wizard_web_socket, container, false)
	}

	override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
		super.onViewCreated(view, savedInstanceState)

		deviceFound = view.findViewById(R.id.wizard_socket_ip_box)
		socketConnected = view.findViewById(R.id.wizard_socket_connected_box)
	}

	override fun onAttach(context: Context) {
		super.onAttach(context)
	}

	override fun onDetach() {
		super.onDetach()
		listener = null
	}

	fun setListener(listener: WizardFragmentListener) {
		this.listener = listener
	}

	fun setDeviceFound(found: Boolean) {
		this.deviceFound.isChecked = found
	}

	fun setDeviceConnected(connected: Boolean) {
		this.socketConnected.isChecked = connected
	}

	companion object {
		/**
		 * Use this factory method to create a new instance of
		 * this fragment using the provided parameters.
		 *
		 * @param param1 Parameter 1.
		 * @param param2 Parameter 2.
		 * @return A new instance of fragment WizardWebSocket.
		 */
		// TODO: Rename and change types and number of parameters
		@JvmStatic
		fun newInstance(param1: String, param2: String) =
			WizardWebSocket().apply {
				arguments = Bundle().apply {

				}
			}
	}
}
