const LOG_PREFIX = '[ TAB_TIMEOUT ]';

let FEAURE_TOGGLE = false;
let INACTIVITY_THRESHOLD = 60;
let WORKER_ACTIVE = false;
let TAB_ACTIVE_TIME;
let TAB_REMOVAL_INTERVAL;

const shouldTabBeRemoved = async (tab) => {
  const currentTime = new Date().getTime();

  if (currentTime < TAB_REMOVAL_INTERVAL) {
    console.log(`${LOG_PREFIX} Tab remove interval has not yet arrived. Skipping`, tab);
    return false;
  }

  if (tab.lastAccessed) {
    const tabLastAccessed = tab.lastAccessed;
    const tabLastAccessedTimeDiff = (currentTime - tabLastAccessed) / 1000 / 60;
    if (tabLastAccessedTimeDiff >= INACTIVITY_THRESHOLD) {
      console.log(`${LOG_PREFIX} Tab should be closed`, tab, { FEAURE_TOGGLE, INACTIVITY_THRESHOLD }, tabLastAccessedTimeDiff);
      return true;
    }
  }
  return false;
};

const fetchAllTabs = async () => {
  const allTabs = (await chrome.tabs.query({ active: false, pinned: false, groupId: -1 })) || [];
  return allTabs;
};

const validateAndRemoveTabs = async () => {
  if (WORKER_ACTIVE) {
    console.log(`${LOG_PREFIX} Worker already active, so skipping this turn`);
    return;
  }
  WORKER_ACTIVE = true;
  const allOpenTabs = await fetchAllTabs();
  console.log(`${LOG_PREFIX} List of all open tabs`, allOpenTabs);
  for (let i = 0; i < allOpenTabs.length; i++) {
    const tab = allOpenTabs[i];
    const shouldCloseTab = await shouldTabBeRemoved(tab);
    if (shouldCloseTab) {
      chrome.tabs.remove(tab.id).catch((err) => console.log(`${LOG_PREFIX} Error while removing tab`, err));
    }
  }
  WORKER_ACTIVE = false;
};

const updatedExtensionValues = (request) => {
  console.log(`${LOG_PREFIX} Updating extension values`, request);

  if (request.featureToggle) {
    FEAURE_TOGGLE = request.featureToggle;
  }

  if (request.inactivityThreshold) {
    INACTIVITY_THRESHOLD = request.inactivityThreshold;
  }
};

const onDeviceStateChange = (deviceStatus) => {
  if (deviceStatus === 'active') {
    updateDeviceActiveTime();
  }
};

const updateDeviceActiveTime = () => {
  TAB_ACTIVE_TIME = new Date().getTime();
  console.log(`${LOG_PREFIX} Tab active time updated`, TAB_ACTIVE_TIME);
  updateNextTabRemoveInterval();
};

const updateNextTabRemoveInterval = () => {
  TAB_REMOVAL_INTERVAL = TAB_ACTIVE_TIME + INACTIVITY_THRESHOLD * 60 * 1000;
  console.log(`${LOG_PREFIX} Tab removal interval updated`, TAB_REMOVAL_INTERVAL);
};

const backgroundWorker = () => {
  chrome.tabs.onUpdated.addListener(async () => {
    validateAndRemoveTabs();
  });

  chrome.idle.onStateChanged.addListener(async (deviceStatus) => {
    onDeviceStateChange(deviceStatus);
  });

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    updatedExtensionValues(request);
  });

  updateDeviceActiveTime();
};

backgroundWorker();
