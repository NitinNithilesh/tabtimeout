const globalStorage = {
  featureToggle: false,
  inactivityThreshold: 60,
};

const bootstrap = async () => {
  const result = await chrome.storage.sync.get(['featureToggle', 'inactivityThreshold']);

  if (result && result.featureToggle) {
    globalStorage.featureToggle = result.featureToggle;
  }

  if (result && result.inactivityThreshold) {
    globalStorage.inactivityThreshold = result.inactivityThreshold;
  }

  if (globalStorage.featureToggle) {
    document.getElementById('enabledradiobtn').checked = true;
    document.getElementById('disabledradiobtn').checked = false;
  } else {
    document.getElementById('disabledradiobtn').checked = true;
    document.getElementById('enabledradiobtn').checked = false;
  }

  document.getElementById('inactivitythreshold').value = globalStorage.inactivityThreshold;

  await chrome.runtime.sendMessage(globalStorage);

  return;
};

const enableFeatureToggle = async () => {
  globalStorage.featureToggle = true;
  await chrome.storage.sync.set({ featureToggle: true });
  bootstrap();
};

const disableFeatureToggle = async () => {
  globalStorage.featureToggle = false;
  await chrome.storage.sync.set({ featureToggle: false });
  bootstrap();
};

const saveInactivityThreshold = async () => {
  const inactivityThreshold = document.getElementById('inactivitythreshold');
  globalStorage.inactivityThreshold = inactivityThreshold.value;
  await chrome.storage.sync.set({ inactivityThreshold: inactivityThreshold.value });
  bootstrap();
};

try {
  document.addEventListener('DOMContentLoaded', bootstrap);

  document.getElementById('enabledradiobtn').addEventListener('change', enableFeatureToggle);
  document.getElementById('disabledradiobtn').addEventListener('change', disableFeatureToggle);
  document.getElementById('inactivitythreshold').addEventListener('change', saveInactivityThreshold);
} catch (err) {
  console.log('Error on listening to DOM events', err);
}
