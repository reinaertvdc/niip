from json import dumps as jsonDumps
from json import loads as jsonLoads
from socket import socket
from socket import AF_INET
from socket import SOCK_STREAM
from socket import error as SocketError

from ThreadManager import ThreadManager

instance = None
threadmanager = ThreadManager.getInstance()


class LogServer:
    def __init__(self, ip, port):
        # Init
        self._server = socket(AF_INET, SOCK_STREAM)
        self._server.bind((ip, port))
        # Not really used
        self._stop = False

        # Dictionary <Identifier, Array<Tupple<callback, *args>>
        # Array because we can have multiple data sources
        self._registered = dict()
        self._commands = dict()

        # Register server-commands
        # Each functions here should have the arguments (self, clientSocket, arguments) with arguments being a python dictionary
        self._commands["get-data"] = self._getData

    def listen(self, connections=5):
        global threadmanager

        # Backlog connections
        self._server.listen(connections)

        while not self._stop:
            clientSocket, clientAddress = self._server.accept()

            print('Accepted connection from {}:{}'.format(
                clientAddress[0], clientAddress[1]))

            # Create Thread handling this client
            threadmanager.createThread("{}:{}".format(
                clientAddress[0], clientAddress[1]), self._handleClient, clientSocket)

    # Function to register a data source that can be polled.
    # identifier: The "name" of the data source as will be asked in a request
    # callback: The function that should be called to retrieve the data
    # *args: Arguments can be provided for the callback function
    def registerDataSource(self, identifier, callback, *args):
        # Check if an array already has been made with callbacks
        if identifier not in self._registered:
            self._registered[identifier] = []

        # Add callback
        array = self._registered[identifier]
        array.append((callback, args))

    # Loop for one single client
    def _handleClient(self, clientSocket):
        localStop = False

        try:
            while not localStop and not self._stop:
                # Parse request
                request = clientSocket.recv(1024)
                requestObject = jsonLoads(request)
                responseObject = dict()

                # If one key is "stop", stop the loop
                if "stop" in requestObject.keys():
                    localStop = True
                    continue

                # Parse each key in the dictionary, this key will be the "command" we need to call
                for key in requestObject.keys():
                    # If this command is an actual command, call it
                    if key in self._commands:
                        tempResponse = self._commands[key](
                            clientSocket, requestObject[key])
                        responseObject[key] = tempResponse

                try:
                    # Send our response, send apperantly expects a byte array
                    clientSocket.send(str.encode(
                        str(jsonDumps(responseObject)) + "\n"))
                except:
                    clientSocket.send("{}\n")

            clientSocket.close()

        except SocketError as e:
            print(e)

    # Return data from the first source with the identifier "source"
    def _getAnyDataFromSource(self, source):
        callTupple = self._registered[source][0]
        return callTupple[0](*callTupple[1])

    # Return data from all sources with the identifier "source"
    def _getAllDataFromSource(self, source):
        answers = []

        for callTupple in self._registered[source]:
            answers.append(callTupple[0](*callTupple[1]))

        return answers

    def _getData(self, clientSocket, arguments):
        # Return object
        dataObject = dict()
        # Parse arguments
        sources = arguments["sources"]
        mode = arguments["mode"]

        # Retrieve the data for each data source
        for dataSource in sources:
            if dataSource in self._registered:
                if mode == "any":
                    dataObject[dataSource] = self._getAnyDataFromSource(
                        dataSource)
                elif mode == "all":
                    dataObject[dataSource] = self._getAllDataFromSource(
                        dataSource)

        return dataObject
