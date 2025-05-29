/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2025 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
// utils.jsx

// Utils functions which can be used across.
/* globals app, Errors, File, Folder, LinkStatus, SaveOptions */

// Globals.
var logFileObject

// eslint-disable-next-line no-extend-native
Array.prototype.indexOf = function (item) {
  var index = 0
  var length = this.length
  for (; index < length; index++) {
    if (this[index] === item) {
      return index
    }
  }
  return -1
}

// eslint-disable-next-line no-extend-native
if (typeof Array.isArray === 'undefined') {
  Array.isArray = function (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]'
  }
}

// Create a UTILS object to store utility functions and variables.
var UTILS = {}

// Initialize various properties of the UTILS object.
UTILS.Logs = [] // Stores log messages.
UTILS.workingFolder = '' // Path of the working folder.
UTILS.outputFolder = '' // Path of the output folder.
UTILS.assetsToBeUploaded = [] // List of assets that need to be uploaded.
UTILS.createSeparateLogFile = true // Flag to determine if a separate log file should be created.
// Get the current date and time
var now = new Date()

// Convert to Unix timestamp (in seconds)
var unixTimestamp = Math.floor(now.getTime() / 1000)
UTILS.logFilePath = 'LogFile_' + unixTimestamp + '.txt' // File name for logging.

// Converts the package in appropriate format, which can be returned from the capability.
UTILS.GetFinalReturnPackage = function (obj) {
  UTILS.Log('Final package created')
  return JSON.stringify(obj)
}

// Creates and returns the package to be returned in case the job is successful.
UTILS.GetSuccessReturnObj = function (data) {
  var obj = {}
  obj.status = 'SUCCESS'
  obj.assetsToBeUploaded = UTILS.assetsToBeUploaded // Attach the list of assets to be uploaded.
  var dataURL = UTILS.WriteToFile(data, 'outputData') // Save data to file.
  if (dataURL) {
    obj.dataURL = dataURL
  }
  return obj
}

// Creates and returns the package to be returned in case the job has failed.
UTILS.GetFailureReturnObj = function (errorCode, errorString, data) {
  var obj = {}
  obj.status = 'FAILURE'
  obj.errorCode = errorCode // Attach the error code.
  obj.errorString = errorString // Attach the error message.
  obj.data = data // Include additional data if available.
  return obj
}

// Add an asset which is to be uploaded and sent back to the caller.
UTILS.AddAssetToBeUploaded = function (assetPath, data) {
  var assetToBeUploaded = {}
  assetToBeUploaded.path = assetPath
  if (data !== undefined) {
    assetToBeUploaded.data = data // Include additional asset data if provided.
  }
  UTILS.assetsToBeUploaded.push(assetToBeUploaded)
}

// This handles errors in case an exception is raised. This results the capability returning error to the caller.
UTILS.HandleError = function (exception) {
  var errorCode, errorString
  UTILS.Log('Exception occurred: ' + JSON.stringify(exception))

  // Handle specific exception cases
  if (exception.message === 'open') {
    exception.message = Errors.CannotOpenFileError.errorStrings[0]
    exception.errorCode = Errors.CannotOpenFileError.errorCode
  }

  errorString = 'Script error: '
  if (exception.isCustom === true) {
    if (exception.message) {
      errorString = errorString + exception.message
    }
    errorCode = exception.errorCode
  } else {
    errorCode = Errors.ProcessingErrorOccurred.errorCode
    if (exception.message) {
      errorString = errorString + Errors.ProcessingErrorOccurred.errorStrings[0] + ' ' + exception.message
    }
    if (exception.errorCode !== undefined) {
      errorString = errorString + '\nInternal error code: ' + exception.errorCode + '.'
    }
    if (exception.line !== undefined) {
      errorString = errorString + ' Line: ' + exception.line + '.'
    }
    if (exception.fileName !== undefined) {
      errorString = errorString + ' FileName: ' + exception.fileName + '.'
    }
    UTILS.Log('Processing error occurred. ' + errorString)
  }

  return UTILS.GetFailureReturnObj(errorCode, errorString)
}

// This is used to raise an exception with all the required details.
// NOTE: This takes variable list of argument and then try to fill in the details in errorObj.errorStrings
UTILS.RaiseException = function (errorObj) {
  UTILS.Log('RaiseException()')
  var numMessageParameters = arguments.length
  UTILS.Log('', 'numMessageParameters: ' + numMessageParameters)
  var numErrorStrings = errorObj.errorStrings.length
  UTILS.Log('', 'numErrorStrings: ' + numErrorStrings)
  var numIterations = (numMessageParameters > numErrorStrings) ? numErrorStrings : numMessageParameters
  var errorMessage = errorObj.errorStrings[0]
  UTILS.Log('', 'Default errorMessage: ' + errorMessage)

  // Construct the detailed error message using available parameters.
  for (var itr = 1; itr < numIterations; itr++) {
    var parameter = arguments[itr]
    if (parameter !== undefined && parameter !== '') {
      var parameterMessage = errorObj.errorStrings[itr]
      errorMessage = errorMessage + ' ' + parameterMessage.replace('^1', parameter)
      UTILS.Log('', 'Appended errorMessage: ' + errorMessage)
    }
  }

  // Throw an exception object with custom details.
  var exceptionObj = {
    number: errorObj.errorCode,
    isCustom: true,
    message: errorMessage
  }

  throw exceptionObj
}

// This will update out-of-date links in a document.
UTILS.UpdateDocumentLinks = function (document) {
  var links = document.links
  var numLinks = links.length
  var linkItr, link, uri
  var outOfDateLinks = []

  UTILS.Log('Number of links: ' + numLinks)
  for (linkItr = 0; linkItr < numLinks; linkItr++) {
    try {
      link = links[linkItr]
      uri = link.linkResourceURI
      UTILS.Log(linkItr + ': URI: ' + uri)
      if (link.status === LinkStatus.LINK_OUT_OF_DATE) {
        outOfDateLinks.push(link.id)
      }
    } catch (err) {
      UTILS.Log('Link status unknown : ' + err)
    }
  }

  // Update all out-of-date links.
  numLinks = outOfDateLinks.length
  for (linkItr = 0; linkItr < numLinks; linkItr++) {
    link = document.links.itemByID(outOfDateLinks[linkItr])
    if (link.isValid) {
      link.update()
    }
  }

  // Recompose the document after updating links.
  var composeStartTime = new Date().getTime()
  document.recompose()
  var composedTime = (new Date()).getTime() - composeStartTime
  UTILS.Log('document.recompose Time: ' + composedTime)
}

// This Embeds all the links in the document.
UTILS.EmbedDocumentLinks = function (document) {
  var links = document.links
  var numLinks = links.length
  var linkItr, link

  for (linkItr = 0; linkItr < numLinks; linkItr++) {
    try {
      link = links[linkItr]
      if (link.status === LinkStatus.NORMAL) {
        link.unlink()
      }
    } catch (err) {
      UTILS.Log('Unable to embed link: status is unknown : ' + err)
    }
  }
}

// Trims leading and trailing spaces from a string.
UTILS.Trim = function (val) {
  return val.replace(/^\s+|\s+$/gm, '')
}

// Removes all the spaces from a string.
UTILS.RemoveAllSpaces = function (val) {
  return val.replace(/\s/g, '')
}

// Converts a value to integer. Exception is thrown if the conversion fails.
UTILS.GetBoolean = function (val) {
  if (val === 'true' || val === true) {
    return true
  } else if (val === 'false' || val === false) {
    return false
  }

  // throw exception.
  UTILS.Log('GetBoolean() val: ' + val)
  UTILS.RaiseException(Errors.ParsingBoolError, val)
}

// Gets a boolean from an 'object' defined with 'key'.
// A default value can be passed via 'defaultVal' which will be used if the key is missing. The case of key can be ignored via 'ignoreCase'.
// In case, key is missing and a default value is not provided, an exception will be thrown. Exception will also be thrown if the conversion of the provided value fails.
UTILS.GetBooleanFromObject = function (object, key, defaultVal, ignoreCase) {
  var val
  UTILS.Log('GetBooleanFromObject ' + key)

  if (UTILS.IsKeyPresent(object, key)) {
    val = UTILS.GetValueFromObject(object, key, ignoreCase)
    if (val === 'true' || val === true) {
      return true
    } else if (val === 'false' || val === false) {
      return false
    }

    UTILS.Log('GetBooleanFromObject() val: ' + val)
    UTILS.RaiseException(Errors.ParsingBoolError, val, key)
  } else if (defaultVal === undefined) {
    UTILS.RaiseException(Errors.MissingKey, key)
  } else {
    // default value provided.
    return defaultVal
  }
}

// Converts a value to integer. Exception is thrown if the conversion fails.
UTILS.GetInteger = function (val) {
  var returnVal = parseInt(val)
  if (!isNaN(returnVal)) {
    return returnVal
  }

  UTILS.Log('GetInteger() val: ' + val)
  UTILS.RaiseException(Errors.ParsingIntError, val)
}

// Gets a integer from an 'object' defined with 'key'.
// A default value can be passed via 'defaultVal' which will be used if the key is missing. The case of key can be ignored via 'ignoreCase'.
// In case, key is missing and a default value is not provided, an exception will be thrown. Exception will also be thrown if the conversion of the provided value fails.
UTILS.GetIntegerFromObject = function (object, key, defaultVal, ignoreCase) {
  var val
  UTILS.Log('GetIntegerFromObject ' + key)

  if (UTILS.IsKeyPresent(object, key)) {
    val = UTILS.GetValueFromObject(object, key, ignoreCase)
    var returnVal = parseInt(val)
    if (!isNaN(returnVal)) {
      return returnVal
    }

    UTILS.Log('GetIntegerFromObject() val: ' + val)
    UTILS.RaiseException(Errors.ParsingIntError, val, key)
  } else if (defaultVal === undefined) {
    UTILS.Log('Missing key: ' + key)
    UTILS.RaiseException(Errors.MissingKey, key)
  } else {
    // default value provided.
    return defaultVal
  }
}

// Converts a value to float. Exception is thrown if the conversion fails.
UTILS.GetFloat = function (val) {
  var returnVal = parseFloat(val)
  if (!isNaN(returnVal)) {
    return returnVal
  }

  UTILS.Log('GetFloat() val: ' + val)
  UTILS.RaiseException(Errors.ParsingFloatError, val)
}

// Gets a float from an 'object' defined with 'key'.
// A default value can be passed via 'defaultVal' which will be used if the key is missing. The case of key can be ignored via 'ignoreCase'.
// In case, key is missing and a default value is not provided, an exception will be thrown. Exception will also be thrown if the conversion of the provided value fails.
UTILS.GetFloatFromObject = function (object, key, defaultVal, ignoreCase) {
  var val
  UTILS.Log('GetFloatFromObject ' + key)
  if (UTILS.IsKeyPresent(object, key)) {
    val = UTILS.GetValueFromObject(object, key, ignoreCase)
    var returnVal = parseFloat(val)
    if (!isNaN(returnVal)) {
      return returnVal
    }

    UTILS.Log('GetFloatFromObject() val: ' + val)
    UTILS.RaiseException(Errors.ParsingFloatError, val, key)
  } else if (defaultVal === undefined) {
    UTILS.RaiseException(Errors.MissingKey, key)
  } else {
    // default value provided.
    return defaultVal
  }
}

// Validates a value to be one of the enum definitions.
UTILS.GetEnum = function (enumDef, val) {
  try {
    val = UTILS.Trim(val)
    return UTILS.GetValueFromObject(enumDef, val)
  } catch (e) {
    UTILS.RaiseException(Errors.EnumError, val)
  }
}

// Gets a enum value from an 'object' defined with 'key' and after comparing against an enum definition.
// A default value can be passed via 'defaultVal' which will be used if the key is missing. The case of key can be ignored via 'ignoreCase'.
// In case key is missing and a default value is not provided, an exception will be thrown. Exception will also be thrown if the value is not present in enum definition.
UTILS.GetEnumFromObject = function (enumDef, object, key, defaultVal, ignoreCase) {
  var val
  UTILS.Log('GetEnumFromObject ' + key)

  if (UTILS.IsKeyPresent(object, key)) {
    val = UTILS.GetValueFromObject(object, key, ignoreCase)
    try {
      val = UTILS.Trim(val)
      if (Array.isArray(enumDef) === false) {
        return UTILS.GetValueFromObject(enumDef, val, ignoreCase)
      } else {
        if (enumDef.indexOf(val) >= 0) {
          return val
        }
      }
    } catch (e) {
      UTILS.Log('GetEnumFromObject() val: ' + val)
      UTILS.RaiseException(Errors.EnumError, val, key)
    }

    UTILS.Log('GetEnumFromObject() val: ' + val)
    UTILS.RaiseException(Errors.EnumError, val, key)
  } else if (defaultVal === undefined) {
    UTILS.RaiseException(Errors.MissingKey, key)
  } else {
    // default value provided.
    return defaultVal
  }
}

// Gets a string from an 'object' defined with 'key'.
// A default value can be passed via 'defaultVal' which will be used if the key is missing. The case of key can be ignored via 'ignoreCase'.
// In case, key is missing and a default value is not provided, an exception will be thrown. Exception will also be thrown if the value found is not string.
UTILS.GetStringFromObject = function (object, key, defaultVal, ignoreCase) {
  var val
  UTILS.Log('GetStringFromObject ' + key)

  if (UTILS.IsKeyPresent(object, key)) {
    val = UTILS.GetValueFromObject(object, key, ignoreCase)
    if (typeof val !== 'string') {
      UTILS.RaiseException(Errors.ParsingStringError, val, key)
    } else {
      return val
    }
  } else if (defaultVal === undefined) {
    UTILS.RaiseException(Errors.MissingKey, key)
  } else {
    // default value provided.
    return defaultVal
  }
}

// Gets an array from an 'object' defined with 'key'.
// A default value can be passed via 'defaultVal' which will be used if the key is missing. The case of key can be ignored via 'ignoreCase'.
// In case, key is missing and a default value is not provided, an exception will be thrown. Exception will also be thrown if the value found is not an array.
UTILS.GetArrayFromObject = function (object, key, defaultVal, ignoreCase) {
  var val
  UTILS.Log('GetArrayFromObject ' + key)

  if (UTILS.IsKeyPresent(object, key)) {
    val = UTILS.GetValueFromObject(object, key, ignoreCase)
    if (Array.isArray(val) === false) {
      UTILS.RaiseException(Errors.ArrayExpected, key)
    } else {
      return val
    }
  } else if (defaultVal === undefined) {
    UTILS.RaiseException(Errors.MissingKey, key)
  } else {
    // default value provided.
    return defaultVal
  }
}

// Gets an object from an 'object' defined with 'key'.
// A default value can be passed via 'defaultVal' which will be used if the key is missing. The case of key can be ignored via 'ignoreCase'.
// In case, key is missing and a default value is not provided, an exception will be thrown. Exception will also be thrown if the value found is not an object.
UTILS.GetObjectFromObject = function (object, key, defaultVal, ignoreCase) {
  var val
  UTILS.Log('GetObjectFromObject ' + key)

  if (UTILS.IsKeyPresent(object, key)) {
    val = UTILS.GetValueFromObject(object, key, ignoreCase)
    if (typeof val !== 'object' || Array.isArray(val)) {
      UTILS.RaiseException(Errors.ObjectExpected, key)
    } else {
      return val
    }
  } else if (defaultVal === undefined) {
    UTILS.RaiseException(Errors.MissingKey, key)
  } else {
    // default value provided.
    return defaultVal
  }
}

// Gets the value from an 'object' defined with 'key'.
// The case of key can be ignored via 'ignoreCase'. In case, key is missing an exception will be thrown.
UTILS.GetValueFromObject = function (object, key, ignoreCase) {
  UTILS.Log('GetValueFromObject ' + key)

  if (ignoreCase === true) {
    var objectKey
    for (objectKey in object) {
      if (Object.prototype.hasOwnProperty.call(object, objectKey)) {
        if (objectKey.toLowerCase() === key.toLowerCase()) {
          return object[objectKey]
        }
      }
    }
  } else if (Object.prototype.hasOwnProperty.call(object, key)) {
    return object[key]
  }

  UTILS.RaiseException(Errors.MissingKey, key)
}

// Checks whether a key is present in the object or not.
UTILS.IsKeyPresent = function (object, key) {
  if (Object.prototype.hasOwnProperty.call(object, key)) {
    return true
  }
  return false
}

// Sets the working folder to be used across the capability.
UTILS.SetWorkingFolder = function (workingFolder) {
  workingFolder = workingFolder.replace(/\//g, '\\')
  if (workingFolder.charAt(workingFolder.length - 1) !== '\\') {
    workingFolder = workingFolder + '\\'
  }
  UTILS.workingFolder = workingFolder
  UTILS.OpenLogFileHandle()
}

// Gets the path of the directory for a given path.
UTILS.GetDirPath = function (path) {
  path = path.replace(/\//g, '\\')
  var indexOfSlash = path && path.lastIndexOf('\\')
  if (indexOfSlash >= 0) {
    return path.substr(0, indexOfSlash)
  }
  return ''
}

// Gets the path of the directory for a given path. If 'withExtension is true the file name consists of the file extension and not otherwise.
UTILS.GetFileName = function (path, withExtension) {
  var fileName
  var indexOfSlash = path.lastIndexOf('\\') + 1
  if (indexOfSlash >= 1) {
    fileName = path.substr(indexOfSlash)
    if (withExtension === false) {
      var indexOfDot = path.lastIndexOf('.')
      fileName = path.substr(indexOfSlash, indexOfDot - indexOfSlash)
    }
  } else {
    fileName = path
  }
  return fileName
}

// Get relative path to the working directory for a path.
UTILS.GetRelativePath = function (path) {
  var index = path.indexOf(UTILS.workingFolder)
  if (index === 0) {
    return path.substr(UTILS.workingFolder.length)
  }
  return path
}

// Get relative path to the working directory for a path. This returns in unix notation.
UTILS.GetRelativeReturnPath = function (path) {
  var index = path.indexOf(UTILS.workingFolder)
  if (index === 0) {
    var tempPath = path.substr(UTILS.workingFolder.length)
    tempPath = tempPath.replace(/\\/g, '/')
    return tempPath
  }
}

// Get the full path from a relative and a base path. In absence of base path, working directory is used.
UTILS.GetFullPath = function (relativePath, basePath) {
  var origRelativePath = relativePath
  if (relativePath.indexOf('..') !== -1 || relativePath.indexOf('/') === 0) {
    this.RaiseException(Errors.InCorrectRelativePath, origRelativePath)
  }
  relativePath = relativePath.replace(/\//g, '\\')
  if (relativePath.indexOf('\\.\\') !== -1) {
    this.RaiseException(Errors.InCorrectRelativePath, origRelativePath)
  }

  if (basePath === undefined) {
    basePath = UTILS.workingFolder
  } else {
    basePath = basePath.replace(/\//g, '\\')
    if (basePath.charAt(basePath.length - 1) !== '\\') {
      basePath = basePath + '\\'
    }
  }

  if (relativePath.charAt(0) === '.') {
    relativePath = relativePath.slice(1)
  }
  if (relativePath.charAt(0) === '\\') {
    relativePath = relativePath.slice(1)
  }

  var fullPath = basePath + relativePath
  return fullPath
}

// Get a unique name.
UTILS.GetUniqueName = function () {
  return Math.random().toString().substr(2, 6)
}

// Creates a directory for the path provided.
UTILS.CreateDirectory = function (path) {
  var outputFolder = Folder(path)
  return outputFolder.create()
}

// Creates a directory for the outputs on the basis of relative path passed. In case nothing is passed a random directory is created in working folder.
UTILS.GetOutputDirectory = function (outputFolderPath) {
  var outputPath = ''
  var created = false
  if (outputFolderPath) {
    outputPath = UTILS.GetFullPath(outputFolderPath)
    created = UTILS.CreateDirectory(outputPath)
    var outputFolder = Folder(outputPath)
    if (outputFolder.exists === false) {
      UTILS.RaiseException(Errors.OutputDirError)
    }
  } else {
    var tempName = ''
    do {
      tempName = 'tmp' + UTILS.GetUniqueName()
      outputPath = UTILS.GetFullPath(tempName)
      created = UTILS.CreateDirectory(outputPath)
    } while (!created)
  }
  UTILS.outputFolder = outputPath
  return outputPath
}

// Setup to do the logging.
UTILS.InitiateLogging = function () {
  UTILS.Logs = []
}


// Opens a log file handle if separate logging is enabled.
UTILS.OpenLogFileHandle = function () {
  if (UTILS.createSeparateLogFile === true) {
    logFileObject = new File(UTILS.GetFullPath(UTILS.logFilePath))
    var exists = false

    // Check if the log file already exists
    if (logFileObject.open('read')) {
      exists = true
    }
    UTILS.Log('Creating log file at ' + UTILS.GetFullPath(UTILS.logFilePath))
    
    // Open the log file in append mode if it exists, otherwise create a new file
    if (exists) {
      logFileObject.close()
      logFileObject.open('append')
    } else {
      logFileObject.open('write')
    }
  }
}

// Ends logging by closing the log file handle if separate logging is enabled
UTILS.TerminateLogging = function () {
  if (UTILS.createSeparateLogFile === true) {
    logFileObject.close()
  }
}

// This logs any provided information
UTILS.Log = function (log) {
  var logText

  // Convert non-string logs to JSON format
  if (log === undefined) {
    logText = ''
  } else if (typeof primaryLog !== 'string') {
    logText = JSON.stringify(log)
  } else {
    logText = log
  }

  if (UTILS.createSeparateLogFile === true) {

    // Write to file if log file object exists
    if (logFileObject) {
      if (UTILS.Logs.length > 0) {
        for (var itr = 0; itr < UTILS.Logs.length; itr++) {
          logFileObject.writeln(UTILS.Logs[itr])
        }
        UTILS.Logs = []
      }
      logFileObject.writeln(logText)
    } else {
      UTILS.Logs.push(logText)
    }
  } else {
    UTILS.Logs.push(logText)
  }
}

// Writes data to a uniquely named JSON file
UTILS.WriteToFile = function (data, fileName) {
  var fileURL, newFile
  var exists = false
  var suffix = ''
  var counter = 1

  // Generate a unique filename if none is provided
  if (fileName === undefined) {
    fileName = UTILS.GetUniqueName()
  }

  // Ensure the file does not already exist
  do {
    fileURL = UTILS.GetFullPath(fileName + suffix + '.json')
    newFile = File(fileURL)
    if (newFile.open('read')) {
      exists = true
      suffix = counter++
      newFile.close()
    } else {
      exists = false
    }
  } while (exists)

  // Write data to the file
  newFile.encoding = 'UTF8'
  newFile.open('write')
  if (newFile.write(JSON.stringify(data))) {
    UTILS.Log('Data was successfully written')
    newFile.close()
    return (fileName + suffix + '.json')
  } else {
    UTILS.Log('Data write failed')
    newFile.close()
  }
}

// Closes all open documents in the application.
UTILS.CloseAllOpenDocuments = function () {
  UTILS.Log('Closing all the documents')
  app.documents.everyItem().close(SaveOptions.NO)
}
