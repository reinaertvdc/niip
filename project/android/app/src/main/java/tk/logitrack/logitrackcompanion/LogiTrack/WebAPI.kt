package tk.logitrack.logitrackcompanion.LogiTrack

import io.reactivex.Observable
import retrofit2.Retrofit
import retrofit2.adapter.rxjava2.RxJava2CallAdapterFactory
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Path
import tk.logitrack.logitrackcompanion.Data.NodeData
import tk.logitrack.logitrackcompanion.Data.UserData

interface WebAPI {
	@GET("nodes/{node}")
	fun getNode(@Header("Authorization") authorization: String, @Path("node") nodeID: String): Observable<NodeData>

	@GET("users/{user}")
	fun getUser(@Header("Authorization") authorization: String, @Path("user") user: String): Observable<UserData>

	companion object {
		fun create(): WebAPI {
			val retrofit = Retrofit.Builder()
				.addCallAdapterFactory(
					RxJava2CallAdapterFactory.create())
				.addConverterFactory(
					MoshiConverterFactory.create())
				.baseUrl("https://logitrack.tk/api/" /*"http://192.168.1.196:5454/api/"*/)
				.build()

			return retrofit.create(WebAPI::class.java)
		}
	}
}