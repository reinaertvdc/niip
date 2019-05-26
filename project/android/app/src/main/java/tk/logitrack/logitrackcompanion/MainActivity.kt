package tk.logitrack.logitrackcompanion

import android.content.IntentFilter
import android.net.wifi.WifiManager
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentManager
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.tinder.scarlet.lifecycle.android.AndroidLifecycle
import io.reactivex.plugins.RxJavaPlugins
import tk.logitrack.logitrackcompanion.Fragments.*
import tk.logitrack.logitrackcompanion.Fragments.ConnectionWizard.ConnectionFragment
import tk.logitrack.logitrackcompanion.Helpers.KillSwitchLifecycle
import tk.logitrack.logitrackcompanion.LogiTrack.NodeAPI
import tk.logitrack.logitrackcompanion.Services.WiFiListener

class MainActivity : AppCompatActivity() {
    private val fragmentManager: FragmentManager = supportFragmentManager

    private val connectionFragment: ConnectionFragment = ConnectionFragment.newInstance()
    private val mapFragment: MapFragment = MapFragment.newInstance()
    private val obdFragment: OBDFragment = OBDFragment.newInstance()

    var activeFragment: LongLifeFragment = connectionFragment

    private val onNavigationItemSelectedListener = BottomNavigationView.OnNavigationItemSelectedListener { item ->
        when (item.itemId) {
            R.id.navigation_home -> {
                fragmentManager.beginTransaction().hide(activeFragment).show(connectionFragment).commit()
                connectionFragment.onFragmentActive()
                activeFragment.onFragmentNonActive()
                activeFragment = connectionFragment
                return@OnNavigationItemSelectedListener true
            }
            R.id.navigation_dashboard -> {
                fragmentManager.beginTransaction().hide(activeFragment).show(obdFragment).commit()
                obdFragment.onFragmentActive()
                activeFragment.onFragmentNonActive()
                activeFragment = obdFragment
                return@OnNavigationItemSelectedListener true
            }
            R.id.navigation_map -> {
                fragmentManager.beginTransaction().hide(activeFragment).show(mapFragment).commit()
                mapFragment.onFragmentActive()
                activeFragment.onFragmentNonActive()
                activeFragment = mapFragment
                return@OnNavigationItemSelectedListener true
            }
        }
        false
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        val navView: BottomNavigationView = findViewById(R.id.nav_bar)

        navView.setOnNavigationItemSelectedListener(onNavigationItemSelectedListener)
        NodeAPI.setLifecycle(AndroidLifecycle.ofApplicationForeground(application))

        fragmentManager.beginTransaction().add(R.id.fragment_container, mapFragment, "mapFragment").hide(mapFragment).commit()
        fragmentManager.beginTransaction().add(R.id.fragment_container, obdFragment, "obdFragment").hide(obdFragment).commit()
        fragmentManager.beginTransaction().add(R.id.fragment_container, connectionFragment, "connectionFragment").commit()

        RxJavaPlugins.setErrorHandler {

        }
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter()
	    filter.addAction(WifiManager.NETWORK_STATE_CHANGED_ACTION)
        registerReceiver(WiFiListener, filter)
    }

    override fun onPause() {
        super.onPause()
        unregisterReceiver(WiFiListener)
    }

    override fun onBackPressed() {
        super.onBackPressed()
        NodeAPI.disconnect()
    }
}
