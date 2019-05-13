package tk.logitrack.logitrackcompanion.Fragments

import android.app.Activity.RESULT_OK
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Uri
import android.net.wifi.WifiManager
import android.opengl.Visibility
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.viewpager.widget.ViewPager
import com.tbuonomo.viewpagerdotsindicator.DotsIndicator
import com.tinder.scarlet.WebSocket
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.schedulers.Schedulers
import tk.logitrack.logitrackcompanion.Data.LoginData
import tk.logitrack.logitrackcompanion.Data.NodeData
import tk.logitrack.logitrackcompanion.Data.UserData
import tk.logitrack.logitrackcompanion.LogiTrack.ListData
import tk.logitrack.logitrackcompanion.LogiTrack.NodeAPI
import tk.logitrack.logitrackcompanion.LogiTrack.StandardReply
import tk.logitrack.logitrackcompanion.LogiTrack.WebAPI
import tk.logitrack.logitrackcompanion.R
import tk.logitrack.logitrackcompanion.R.layout
import tk.logitrack.logitrackcompanion.ServiceScanner

// TODO: Rename parameter arguments, choose names that match
// the fragment initialization parameters, e.g. ARG_ITEM_NUMBER
private const val ARG_SERVICE_NAME = "serviceName"
private const val ARG_SERVICE_TYPE = "serviceType"

/**
 * A simple [Fragment] subclass.
 * Activities that contain this fragment must implement the
 * [ConnectionFragment.OnFragmentInteractionListener] interface
 * to handle interaction events.
 * Use the [ConnectionFragment.newInstance] factory method to
 * create an instance of this fragment.
 *
 */
class ConnectionFragment : Fragment(), WizardFragmentListener {
	private lateinit var parentContext: FragmentActivity
	private lateinit var adapter: ConnectionWizardAdapter

	private lateinit var scanner: ServiceScanner
	private lateinit var webAPI: WebAPI
	private var listener: WizardFragmentListener? = null

	private var loginData: LoginData? = null
	private var userData: UserData? = null
	private var nodeData: NodeData? = null

	private lateinit var viewPager: ViewPager

	private lateinit var topFill: View
	private lateinit var username: TextView
	private lateinit var userImage: ImageView

	private var currentStep = 0
	private val maxSteps = 4

	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
		arguments?.let {
		}
	}

	override fun onCreateView(
		inflater: LayoutInflater, container: ViewGroup?,
		savedInstanceState: Bundle?
	): View? {
		// Inflate the layout for this fragment
		return inflater.inflate(layout.fragment_connection, container, false)
	}

	override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
		super.onViewCreated(view, savedInstanceState)

		topFill = view.findViewById(R.id.top_fill)
		username = view.findViewById(R.id.user_name)
		userImage = view.findViewById(R.id.user_image)

		topFill.visibility = View.GONE
		username.visibility = View.GONE
		userImage.visibility = View.GONE

		val dotsIndicator = view.findViewById<DotsIndicator>(R.id.dots_indicator)
		viewPager = view.findViewById(R.id.connection_wizard)
		adapter = ConnectionWizardAdapter(parentContext.supportFragmentManager, this)
		viewPager.adapter = adapter
		viewPager.setCurrentItem(0)
		dotsIndicator.setViewPager(viewPager)

	}

	override fun onActivityCreated(savedInstanceState: Bundle?) {
		super.onActivityCreated(savedInstanceState)

		webAPI = WebAPI.create()
	}

	override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
		super.onActivityResult(requestCode, resultCode, data)

		Log.d(javaClass.canonicalName, "Activity Result")
		when(requestCode) {
			0 ->
				if(resultCode == RESULT_OK && data != null) {
					val token: String = data.getStringExtra("token")
					val id: String = data.getStringExtra("id")
					onLogin(token, id)
				}
				else {
					onLoginFail()
				}
		}
	}

	override fun onLogin(token: String, id: String) {
		loginData = LoginData(token, id)

		webAPI.getUser(id)
			.subscribeOn(Schedulers.io())
			.observeOn(AndroidSchedulers.mainThread())
			.subscribe({
				result: UserData ->
					onUserData(result)
			}, {
				error ->
					Log.e(this.javaClass.canonicalName, error.toString())
			})

		webAPI.getNode(id)
			.subscribeOn(Schedulers.io())
			.observeOn(AndroidSchedulers.mainThread())
			.subscribe({
				result: NodeData ->
					onNodeData(result)
			}, {
				error ->
					Log.e(this.javaClass.canonicalName, error.toString())
			})
	}

	override fun onLogout() {
		TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
	}

	fun onUserData(data: UserData) {
		this.userData = data

		this.topFill.visibility = View.VISIBLE
		this.username.visibility = View.VISIBLE
		this.userImage.visibility = View.VISIBLE
		this.username.text = userData!!.firstName + " " + userData!!.lastName

		adapter.getLoginFragment().setRequestImage(true)
		adapter.getLoginFragment().setRequestName(true)

		checkLoginStep()
	}

	fun onNodeData(data: NodeData) {
		nodeData = data

		adapter.getLoginFragment().setRequestNode(true)
		adapter.getWifiFragment().setCurrentWiFi(getCurrentSSID())
		adapter.getWifiFragment().setWantedWiFi(data.ssid)

		checkLoginStep()
	}

	fun checkLoginStep() {
		if(userData != null && nodeData != null && loginData != null) {
			if(getCurrentSSID().compareTo(nodeData!!.ssid) == 0) {
				viewPager.setCurrentItem(2)
				startScanner()
			}
			else {
				viewPager.setCurrentItem(1)
			}
		}
	}

	fun onLoginFail() {

	}

	override fun onWiFiConnect() {
		// TODO SWITCH WIFI
	}

	override fun onAttach(context: Context) {
		super.onAttach(context)

		parentContext = context as FragmentActivity
		scanner = ServiceScanner(getString(R.string.service_name), getString(R.string.service_type), context)
	}

	override fun onDetach() {
		super.onDetach()
		listener = null
	}

	private fun getCurrentSSID(): String {
		var ssid = "None"

		val connManager = parentContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
		val networkInfo = connManager.getNetworkInfo(ConnectivityManager.TYPE_WIFI)
		if (networkInfo.isConnected) {
			val wifiManager = context!!.getSystemService(Context.WIFI_SERVICE) as WifiManager
			val connectionInfo = wifiManager.connectionInfo
			if (connectionInfo != null && connectionInfo.ssid.isNotEmpty()) {
				ssid = connectionInfo.ssid
				ssid = ssid.removeRange(0, 1)
				ssid = ssid.removeRange(ssid.length - 1, ssid.length)
			}
		}
		return ssid
	}

	fun startScanner() {
		scanner.search {
				host: String, port: Int ->
			onServiceFound(host, port)
		}
	}

	fun onServiceFound(host: String, port: Int) {
		adapter.getWebsocketFragment().setDeviceFound(true)

		NodeAPI.connect(host, port)
		NodeAPI.api.observeWebSocketEvent().subscribe {
				event ->
			if(event is WebSocket.Event.OnConnectionOpened<*>) {
				onSocketOpened()
			}
			else if(event is WebSocket.Event.OnConnectionClosed) {
				onSocketClosed()
			}
			else if(event is WebSocket.Event.OnConnectionFailed) {
				onSocketFailed()
			}
		}
	}

	fun onSocketOpened() {
		adapter.getWebsocketFragment().setDeviceConnected(true)
		scanner.stop()
	}

	fun onSocketClosed() {
		adapter.getWebsocketFragment().setDeviceConnected(false)
		startScanner()
	}

	fun onSocketFailed() {
		adapter.getWebsocketFragment().setDeviceConnected(false)
		startScanner()
	}

	override fun onAutoConnectChange(value: Boolean) {
		TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
	}

	companion object {
		/**
		 * Use this factory method to create a new instance of
		 * this fragment using the provided parameters.
		 *
		 * @param param1 Parameter 1.
		 * @param param2 Parameter 2.
		 * @return A new instance of fragment ConnectionFragment.
		 */
		// TODO: Rename and change types and number of parameters
		@JvmStatic
		fun newInstance(serviceName: String, serviceType: String) =
			ConnectionFragment().apply {
				arguments = Bundle().apply {
					putString(ARG_SERVICE_NAME, serviceName)
					putString(ARG_SERVICE_TYPE, serviceType)
				}
			}
	}
}
