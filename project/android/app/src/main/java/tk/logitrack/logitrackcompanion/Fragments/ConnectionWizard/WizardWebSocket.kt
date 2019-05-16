package tk.logitrack.logitrackcompanion.Fragments.ConnectionWizard

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.CheckBox
import tk.logitrack.logitrackcompanion.R

class WizardWebSocket : WizardFragment() {
	private var listener: WizardFragmentListener? = null

	private lateinit var deviceFound: CheckBox
	private lateinit var socketConnected: CheckBox

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

		if(listener != null) {
			listener!!.onWebSocketReady()
		}
	}

	override fun onFragmentActive() {

	}

	override fun onFragmentNonActive() {

	}

	override fun setListener(listener: WizardFragmentListener) {
		this.listener = listener
	}

	fun setDeviceFound(found: Boolean) {
		this.deviceFound.isChecked = found
	}

	fun setDeviceConnected(connected: Boolean) {
		this.socketConnected.isChecked = connected
	}

	companion object { @JvmStatic
		fun newInstance() =
			WizardWebSocket().apply {
				arguments = Bundle().apply {

				}
			}
	}
}
