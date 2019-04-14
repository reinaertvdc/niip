#!/usr/bin/env python3

import socket
import threading


HOST_ADDR = '0.0.0.0'
HOST_PORT = 2222


terminate = False


threads_tcp = []


def handle_connection_tcp(conn, addr):
    print(threading.current_thread())
    with conn:
        conn.settimeout(5)
        while not terminate:
            try:
                data = conn.recv(1024)
                if not data:
                    break
                print(data)
            except socket.timeout:
                pass


def server_tcp():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(5)
        s.bind((HOST_ADDR, HOST_PORT))
        s.listen(4)
        while not terminate:
            try:
                conn, addr = s.accept()
                tmp = threading.Thread(target=handle_connection_tcp, args=(conn, addr))
                tmp.start()
                threads_tcp.append(tmp)
            except socket.timeout:
                pass


def server_udp():
    pass


thread_tcp = threading.Thread(target=server_tcp)
thread_udp = threading.Thread(target=server_udp)

thread_tcp.start()
thread_udp.start()

done = False
while not done:
    try:
        thread_tcp.join()
        thread_udp.join()
        done = True
    except KeyboardInterrupt:
        terminate = True
