const extensionValues = {
  featureToggle: false,
  inactivityThreshold: 60,
};

const shouldTabBeRemoved = async (tab) => {
  if (tab.lastAccessed) {
    const currentTime = new Date().getTime();
    const tabLastAccessed = tab.lastAccessed;
    const tabLastAccessedTimeDiff = (currentTime - tabLastAccessed) / 1000 / 60;
    if (tabLastAccessedTimeDiff >= extensionValues.inactivityThreshold) {
      console.log('Tab should be closed', tab, extensionValues, tabLastAccessedTimeDiff);
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
  const allOpenTabs = await fetchAllTabs();
  console.log('AOT', allOpenTabs);
  for (let i = 0; i < allOpenTabs.length; i++) {
    const tab = allOpenTabs[i];
    const shouldCloseTab = await shouldTabBeRemoved(tab);
    if (shouldCloseTab) {
      chrome.tabs.remove(tab.id).catch((err) => console.log(`Error while removing tab`, err));
    }
  }
};

const updatedExtensionValues = (request) => {
  console.log('Updating extension values', request);
  if (request.featureToggle) {
    extensionValues.featureToggle = request.featureToggle;
  }

  if (request.inactivityThreshold) {
    extensionValues.inactivityThreshold = request.inactivityThreshold;
  }
};

const backgroundWorker = () => {
  chrome.tabs.onUpdated.addListener(async () => {
    validateAndRemoveTabs();
  });

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    updatedExtensionValues(request);
  });
};

backgroundWorker();
