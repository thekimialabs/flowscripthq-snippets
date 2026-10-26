// How to Copy a Google Drive Folder with Apps Script
// Tutorial: https://flowscripthq.blogspot.com/2026/10/how-to-copy-google-drive-folder-with.html
// From FlowScriptHQ — https://flowscripthq.blogspot.com

function copyDriveFolder() {
  var sourceFolderId = 'PASTE_SOURCE_FOLDER_ID_HERE';
  var destinationFolderId = 'PASTE_DESTINATION_FOLDER_ID_HERE';

  var sourceFolder = DriveApp.getFolderById(sourceFolderId);
  var destinationFolder = DriveApp.getFolderById(destinationFolderId);

  // Create the top-level copy, named like the original.
  var newFolder = destinationFolder.createFolder(sourceFolder.getName() + ' - Copy');

  copyFolderContents_(sourceFolder, newFolder);
  Logger.log('Done. Copy is at: ' + newFolder.getName());
}

function copyFolderContents_(source, target) {
  // Copy every file in the current folder.
  var files = source.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    file.makeCopy(file.getName(), target);
  }

  // Recurse into each subfolder, creating a matching folder in the copy.
  var folders = source.getFolders();
  while (folders.hasNext()) {
    var sub = folders.next();
    copyFolderContents_(sub, target.createFolder(sub.getName()));
  }
}

// --------------------------------------------------

function copyLargeDriveFolder() {
  var sourceFolderId = 'PASTE_SOURCE_FOLDER_ID_HERE';
  var destinationFolderId = 'PASTE_DESTINATION_FOLDER_ID_HERE';

  var props = PropertiesService.getScriptProperties();
  var queue = JSON.parse(props.getProperty('copyQueue') || '[]');
  var startTime = new Date().getTime();
  var timeLimitMs = 5 * 60 * 1000; // stop with one minute to spare

  if (queue.length === 0) {
    // First run: create the root copy and seed the queue.
    var source = DriveApp.getFolderById(sourceFolderId);
    var root = DriveApp.getFolderById(destinationFolderId)
      .createFolder(source.getName() + ' - Copy');
    queue.push({ sourceId: sourceFolderId, targetId: root.getId() });
  }

  while (queue.length > 0) {
    if (new Date().getTime() - startTime > timeLimitMs) {
      break; // out of time — save progress and stop cleanly
    }
    var job = queue.pop();
    var source = DriveApp.getFolderById(job.sourceId);
    var target = DriveApp.getFolderById(job.targetId);
    var jobDone = true;

    // Copy this folder's files in name order, skipping any an earlier
    // run already copied. Progress is a name checkpoint inside the job
    // itself, so an interrupted folder resumes without re-copying files
    // and without overflowing the 9 KB property-value limit.
    var fileList = [];
    var files = source.getFiles();
    while (files.hasNext()) {
      var f = files.next();
      fileList.push({ file: f, name: f.getName() });
    }
    fileList.sort(function (a, b) { return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0); });
    for (var i = 0; i < fileList.length; i++) {
      if (job.afterName && fileList[i].name <= job.afterName) {
        continue; // already copied on an earlier run
      }
      fileList[i].file.makeCopy(fileList[i].name, target);
      job.afterName = fileList[i].name;
      if (new Date().getTime() - startTime > timeLimitMs) {
        jobDone = false;
        break;
      }
    }

    // Queue subfolders in name order, skipping any already queued.
    if (jobDone) {
      var folderList = [];
      var folders = source.getFolders();
      while (folders.hasNext()) {
        var s = folders.next();
        folderList.push({ id: s.getId(), name: s.getName() });
      }
      folderList.sort(function (a, b) { return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0); });
      for (var j = 0; j < folderList.length; j++) {
        if (job.subsAfter && folderList[j].name <= job.subsAfter) {
          continue; // already queued on an earlier run
        }
        queue.push({
          sourceId: folderList[j].id,
          targetId: target.createFolder(folderList[j].name).getId()
        });
        job.subsAfter = folderList[j].name;
        if (new Date().getTime() - startTime > timeLimitMs) {
          jobDone = false;
          break;
        }
      }
    }

    if (!jobDone) {
      queue.push(job); // interrupted mid-folder — finish it on the next run
    }
  }

  props.setProperty('copyQueue', JSON.stringify(queue));
  if (queue.length === 0) {
    Logger.log('Copy complete.');
    props.deleteProperty('copyQueue');
  } else {
    Logger.log(queue.length + ' folders left. Run again to continue.');
  }
}

// --------------------------------------------------

function copyFileWithDriveApi_(fileId, parentFolderId) {
  Drive.Files.copy(
    { title: DriveApp.getFileById(fileId).getName(), parents: [{ id: parentFolderId }] },
    fileId,
    { supportsAllDrives: true }
  );
}

// --------------------------------------------------

function copyFileWithSharing_(file, target) {
  var copy = file.makeCopy(file.getName(), target);
  var editors = file.getEditors();
  var viewers = file.getViewers();
  for (var i = 0; i < editors.length; i++) {
    copy.addEditor(editors[i]);
  }
  for (var j = 0; j < viewers.length; j++) {
    copy.addViewer(viewers[j]);
  }
  return copy;
}
