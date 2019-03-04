import _thread

from time import sleep

instance = None


class Thread:
    def __init__(self, function, *args):
        # Init
        self._onDone = None
        self._onDoneArgs = None
        self._started = False

        # Save for later
        self._function = function
        self._args = args
        # Ask for a lock to provide a wait
        self._lock = _thread.allocate_lock()

    def setCompletionListener(self, function, *args):
        self._onDone = function
        self._onDoneArgs = args

    def run(self):
        # Lock so we can wait on this thread to finish
        self._lock.acquire()
        self._started = True

        try:
            # Call work function
            self._function(*self._args)
        except:
            self._lock.release()
            raise

        # Call completion listener
        if self._onDone != None:
            self._onDone(*self._onDoneArgs)

        # Release because we are done
        self._lock.release()

    def waitOn(self):
        # Wait till thread starts
        while not self._started:
            sleep(0.1)

        # If thread is still busy this should block
        self._lock.acquire()
        # Release because thread should be done
        self._lock.release()


class ThreadManager:
    def __init__(self):
        # Keep a store of threads
        self._threads = dict()

    def createThread(self, name, function, *args):
        # Can't have duplicate threads
        if name in self._threads:
            raise Exception("Duplicate thread name")

        # Create own thread object (allows us to wait for a thread)
        thread = Thread(function, *args)
        # Register listener so we can clean up
        thread.setCompletionListener(self._onThreadDone, name)
        # Start thread running our Thread object
        threadId = _thread.start_new_thread(thread.run, ())
        # Save their information
        self._threads[name] = (thread, threadId)

    def waitForThreads(self):
        while len(self._threads) > 0:
            thread = self._threads[next(iter(self._threads))][0]
            thread.waitOn()

    def getThread(self, name):
        return self._threads[name][0]

    def getThreadId(self, name):
        return self._threads[name][1]

    def _onThreadDone(self, name):
        if name in self._threads:
            self._threads.pop(name, None)

    @staticmethod
    def getInstance():
        global instance

        if instance == None:
            instance = ThreadManager()

        return instance
