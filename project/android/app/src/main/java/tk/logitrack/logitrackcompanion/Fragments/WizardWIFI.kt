package tk.logitrack.logitrackcompanion.Fragments

import android.content.Context
import android.net.ConnectivityManager
import android.net.Uri
import android.net.wifi.WifiManager
import android.os.Bundle
import android.util.Log
import androidx.fragment.app.Fragment
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.CheckBox
import android.widget.TextView
import org.jetbrains.anko.find
import tk.logitrack.logitrackcompanion.Data.NodeData

import tk.logitrack.logitrackcompanion.R

class WizardWIFI : Fragment() {
	private lateinit var parentContext: Context
	private var listener: WizardFragmentListener? = null

	private lateinit var currentWifi: TextView
	private lateinit var wantedWifi: TextView
	private lateinit var autoConnectBox: CheckBox
	private lateinit var connectButton: Button

	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
	}

	override fun onCreateView(
		inflater: LayoutInflater, container: ViewGroup?,
		savedInstanceState: Bundle?
	): View? {
		// Inflate the layout for this fragment
		return inflater.inflate(R.layout.fragment_wizard_wifi, container, false)
	}

	override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
		super.onViewCreated(view, savedInstanceState)

		currentWifi = view.findViewById(R.id.wizard_wifi_current_wifi)
		wantedWifi = view.findViewById(R.id.wizard_wifi_wanted_wifi)

		autoConnectBox = view.findViewById(R.id.wizard_wifi_autoconnect)
		connectButton = view.findViewById(R.id.wizard_wifi_connect)
	}

	override fun onAttach(context: Context?) {
		super.onAttach(context)

		if(context != null) {
			parentContext = context
		}
	}

	override fun onDetach() {
		super.onDetach()
		listener = null
	}

	fun setListener(listener: WizardFragmentListener) {
		this.listener = listener
	}

	fun setCurrentWiFi(ssid: String) {
		this.currentWifi.text = ssid
	}

	fun setWantedWiFi(ssid: String) {
		this.wantedWifi.text = ssid
	}

	companion object {
		/**
		 * Use this factory method to create a new instance of
		 * this fragment using the provided parameters.
		 *
		 * @param param1 Parameter 1.
		 * @param param2 Parameter 2.
		 * @return A new instance of fragment WizardWIFI.
		 */
		// TODO: Rename and change types and number of parameters
		@JvmStatic
		fun newInstance(param1: String, param2: String) =
			WizardWIFI().apply {
				arguments = Bundle().apply {

				}
			}
	}
}
