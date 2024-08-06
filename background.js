const LOG_PREFIX = '[ TAB_TIMEOUT ]';

let FEAURE_TOGGLE = false;
let INACTIVITY_THRESHOLD = 60;
let WORKER_ACTIVE = false;
let TAB_ACTIVE_TIME;
let TAB_REMOVAL_INTERVAL;
let PREV_DEVICE_STATUS = 'active';

const bootstrap = async () => {
  const result = await chrome.storage.sync.get(['featureToggle', 'inactivityThreshold']);

  if (result && result.featureToggle) {
    FEAURE_TOGGLE = result.featureToggle;
  }

  if (result && result.inactivityThreshold) {
    INACTIVITY_THRESHOLD = result.inactivityThreshold;
  }

  return;
};

const shouldTabBeRemoved = async (tab) => {
  if (tab.lastAccessed) {
    const currentTime = new Date().getTime();
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

  const currentTime = new Date().getTime();
  if (currentTime < TAB_REMOVAL_INTERVAL) {
    console.log(`${LOG_PREFIX} Tab remove interval has not yet arrived. Skipping`, currentTime, TAB_REMOVAL_INTERVAL);
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

  updateDeviceActiveTime();
};

const onDeviceStateChange = (deviceStatus) => {
  console.log(`${LOG_PREFIX} Device status has been updated`, deviceStatus);

  // To update the device active time, the current status has to be active and the previous device status should be locked
  if (['active', 'idle'].includes(deviceStatus) && PREV_DEVICE_STATUS === 'locked') {
    updateDeviceActiveTime();
  }

  PREV_DEVICE_STATUS = deviceStatus;
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

const backgroundWorker = async () => {
  console.log(`${LOG_PREFIX} Background worker has been triggered`);

  await bootstrap();

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
