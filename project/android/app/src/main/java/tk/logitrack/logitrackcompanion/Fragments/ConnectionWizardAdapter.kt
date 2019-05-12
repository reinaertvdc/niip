package tk.logitrack.logitrackcompanion.Fragments

import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.FragmentPagerAdapter

class ConnectionWizardAdapter(fragmentManager: FragmentManager): FragmentPagerAdapter(fragmentManager) {
	private val hotspotFragment: WizardHotspot = WizardHotspot()
	private val loginFragment: WizardLogin = WizardLogin()
	private val webSocketFragment: WizardWebSocket = WizardWebSocket()
	private val wifiFragment: WizardWIFI = WizardWIFI()

	override fun getItem(position: Int): Fragment {
		when (position) {
			0 -> return loginFragment
			1 -> return wifiFragment
			2 -> return webSocketFragment
			3 -> return hotspotFragment
			else -> return loginFragment
		}
	}

	override fun getCount(): Int {
		return 4
	}

	fun getLoginFragment(): WizardLogin {
		return loginFragment
	}

	fun getWifiFragment(): WizardWIFI {
		return wifiFragment
	}

	fun getWebsocketFragment(): WizardWebSocket {
		return webSocketFragment
	}

	fun getHotspotFragment(): WizardHotspot {
		return hotspotFragment
	}
}