package tk.logitrack.logitrackcompanion.Fragments

import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.viewpager.widget.ViewPager
import com.tbuonomo.viewpagerdotsindicator.DotsIndicator
import com.tinder.scarlet.WebSocket
import tk.logitrack.logitrackcompanion.LogiTrack.ListData
import tk.logitrack.logitrackcompanion.LogiTrack.LogiTrackAPI
import tk.logitrack.logitrackcompanion.LogiTrack.StandardReply
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
class ConnectionFragment : Fragment() {
	private lateinit var parentContext: FragmentActivity

	private val nodeSSID: String = "telenet-D1E13"

	private var serviceName: String? = null
	private var serviceType: String? = null
	private var serviceScanner: ServiceScanner? = null
	private var listener: OnFragmentInteractionListener? = null

	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
		arguments?.let {
			serviceName = it.getString(ARG_SERVICE_NAME)
			serviceType = it.getString(ARG_SERVICE_TYPE)
			if(serviceName != null && serviceType != null && context != null) {
				serviceScanner = ServiceScanner(serviceName as String, serviceType as String, context as Context)
				if(!LogiTrackAPI.isConnected) {

				}
			}
		}
	}

	override fun onCreateView(
		inflater: LayoutInflater, container: ViewGroup?,
		savedInstanceState: Bundle?
	): View? {
		// Inflate the layout for this fragment
		return inflater.inflate(layout.fragment_connection, container, false)
	}

	override fun onActivityCreated(savedInstanceState: Bundle?) {
		super.onActivityCreated(savedInstanceState)
		val viewPager: ViewPager = view!!.findViewById(R.id.connection_wizard)
		val dotsIndicator = view!!.findViewById<DotsIndicator>(R.id.dots_indicator)
		viewPager.adapter = ConnectionWizardAdapter(parentContext.supportFragmentManager)
		dotsIndicator.setViewPager(viewPager)
	}

	// TODO: Rename method, update argument and hook method into UI event
	fun onButtonPressed(uri: Uri) {
		listener?.onFragmentInteraction(FragmentName.ConnectionFragment, uri)
	}

	override fun onAttach(context: Context) {
		super.onAttach(context)

		parentContext = context as FragmentActivity
		if (context is OnFragmentInteractionListener) {
			listener = context
		} else {
			throw RuntimeException(context.toString() + " must implement OnFragmentInteractionListener")
		}
	}

	override fun onDetach() {
		super.onDetach()
		listener = null
	}

	fun connect(host: String, port: Int) {
		LogiTrackAPI.connect(host, port)

		val onConnect = LogiTrackAPI.api.observeWebSocketEvent()
			.filter { it is WebSocket.Event.OnConnectionOpened<*> }
			.subscribe {
				LogiTrackAPI.api.sendListData(ListData())
			}

		val listData = LogiTrackAPI.api.observeListData()
			.subscribe {
					data: StandardReply ->
				val sources: Any? = data.data.get("sources")

				if (sources != null && sources is List<*>) {
					Log.d(this.javaClass.name, "Received available data from server: ")

					for (source in sources) {
						Log.d(this.javaClass.name, "\t${source}")
					}
				}
			}

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
