package tk.logitrack.logitrackcompanion

import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentManager
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.tinder.scarlet.lifecycle.android.AndroidLifecycle
import tk.logitrack.logitrackcompanion.Fragments.*
import tk.logitrack.logitrackcompanion.LogiTrack.NodeAPI

class MainActivity : AppCompatActivity() {
    private val fragmentManager: FragmentManager = supportFragmentManager

    private val connectionFragment: ConnectionFragment = ConnectionFragment()
    private val mapFragment: MapFragment = MapFragment()
    private val obdFragment: OBDFragment = OBDFragment()

    var activeFragment: Fragment = connectionFragment

    private val onNavigationItemSelectedListener = BottomNavigationView.OnNavigationItemSelectedListener { item ->
        when (item.itemId) {
            R.id.navigation_home -> {
                fragmentManager.beginTransaction().hide(activeFragment).show(connectionFragment).commit()
                activeFragment = connectionFragment
                return@OnNavigationItemSelectedListener true
            }
            R.id.navigation_dashboard -> {
                fragmentManager.beginTransaction().hide(activeFragment).show(obdFragment).commit()
                activeFragment = obdFragment
                obdFragment.start()
                return@OnNavigationItemSelectedListener true
            }
            R.id.navigation_map -> {
                fragmentManager.beginTransaction().hide(activeFragment).show(mapFragment).commit()
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
    }
}
