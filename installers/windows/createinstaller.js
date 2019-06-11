const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller
const path = require('path')

getInstallerConfig()
  .then(createWindowsInstaller)
  .catch((error) => {
    console.log("error");
    console.error(error.message || error)
    process.exit(1)
  })

function getInstallerConfig () {
  const rootPath = path.join('./')
  const outPath = path.join(rootPath, 'release-builds')

  return Promise.resolve({
    appDirectory: path.join(outPath, 'Cloudvlt-win32-ia32/'),
    authors: 'Christian Engvall',
    noMsi: true,
    outputDirectory: path.join(outPath, 'windows-installer'),
    exe: 'Cloudvlt.exe',
    setupExe: 'Cloudvlt.exe',
    setupIcon: path.join(rootPath, 'assets', 'icons', 'win', 'icon.ico')
  })
}