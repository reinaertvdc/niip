package tk.logitrack.logitrackcompanion.Fragments.ConnectionWizard

import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.FragmentPagerAdapter

class ConnectionWizardAdapter(fragmentManager: FragmentManager, listener: WizardFragmentListener): FragmentPagerAdapter(fragmentManager) {
	private lateinit var loginFragment: WizardLogin
	private lateinit var webSocketFragment: WizardWebSocket
	private lateinit var wifiFragment: WizardWIFI

	init {
		if(!::loginFragment.isInitialized) {
			loginFragment = WizardLogin()
		}
		if(!::webSocketFragment.isInitialized) {
			webSocketFragment = WizardWebSocket()
		}
		if(!::wifiFragment.isInitialized) {
			wifiFragment = WizardWIFI()
		}

		loginFragment.setListener(listener)
		webSocketFragment.setListener(listener)
		wifiFragment.setListener(listener)
	}

	override fun getItem(position: Int): Fragment {
		when (position) {
			0 -> return loginFragment
			1 -> return wifiFragment
			2 -> return webSocketFragment
			else -> return loginFragment
		}
	}

	override fun getCount(): Int {
		return 3
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
}