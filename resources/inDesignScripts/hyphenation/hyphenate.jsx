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


// Following are the file inclusions and not comments.
// @include "Libraries/errors.jsx"
// @include "Libraries/json2.jsx"
// @include "Libraries/utils.jsx"
// File inclusion ends.

// Globals: define any globals here.
var timingObject = {}
var warnings = {}
var document
// Globals end.

// Constant strings for key references
var KeyStrings = {
  OutputPath: 'outputPath',
  ProcessedData: 'processedData',
  TargetDocument: 'targetDocument',
  TimeDocumentClose: 'DocumentClose',
  TimeDocumentOpen: 'DocumentOpen',
  TimeBalancing: 'TimeBalanceRagged',
  TimeOverall: 'Overall',
  TimeRelinkAssets: 'RelinkAssets',
  Timings: 'timings',
  WorkingFolder: 'workingFolder',
  JobID: 'jobID'
}

/* Handles document warnings such as missing links or fonts */
function handleWarnings (document) {
    UTILS.Log('Handling warnings')
    var errorlog = app.errorListErrors
    var warningsObject = {}
  
    var missingLinkArray = []
    var missingFontArray = []
    var failedErrorsArray = []
    var otherWarningsArray = []
    var missingLinkStr = '(Link missing.; '
    var missingLinkStrLen = missingLinkStr.length

    // Iterate through error list and categorize warnings
    for (var i = 0; i < errorlog.count(); i++) {
      var error = errorlog[i]
      UTILS.Log('Warning No. ' + (i + 1) + ': ' + error.listErrorCode + '(' + error.listErrorMessage + ')')
      if (error.listErrorCode === 35842) { // Missing link error
        var missingLink = error.listErrorMessage
        missingLink = missingLink.substring(missingLink.indexOf(missingLinkStr) + missingLinkStrLen)
        if (missingLinkArray.indexOf(missingLink) === -1) {
          missingLinkArray.push(missingLink)
        }
      } else if (error.listErrorCode === 1 && error.listErrorMessage.search(/missing font/i) !== -1) {
        var missingFont = error.listErrorMessage
        missingFont = missingFont.substring(missingFont.search(/missing font/i) + 13)
        if (missingFontArray.indexOf(missingFont) === -1) {
          missingFontArray.push(missingFont)
        }
      } else if (error.listErrorCode === 1) {
        otherWarningsArray.push(error.listErrorMessage)
      }
    }

    // Store collected warnings in an object
    if (missingLinkArray.length > 0) {
      warningsObject.missingLinks = missingLinkArray
    }
    if (missingFontArray.length > 0) {
      warningsObject.missingFonts = missingFontArray
    }
    if (failedErrorsArray.length > 0) {
      warningsObject.exportErrors = failedErrorsArray
    }
    if (otherWarningsArray.length > 0) {
      warningsObject.otherWarnings = otherWarningsArray
    }
    return warningsObject
};

/* Hypenation for text frames within a document */
function hyphenation (document,labels,hyphenate) {

    var allFrames = document.allPageItems;
    var labelledFrames = []

    UTILS.Log('Inside Hyphenate')

    // Convert labels to an object for faster lookups (Set is not available in ExtendScript)
    var labelMap = {};
    if (labels && labels.length > 0) {
        if (!(labels instanceof Array)) {
            labels = [labels]; // Convert single label to an array
        }
        for (var i = 0; i < labels.length; i++) {
            labelMap[labels[i]] = true;
        }

        // Iterate over frames and find those matching the labels
        for (var i = 0; i < allFrames.length; i++) {
            var frame = allFrames[i];
            if (frame instanceof TextFrame && labelMap[frame.label]) {
                labelledFrames.push(frame);
                UTILS.Log('Matching Labels: ' + frame.label);
            }
        }
    } else {
        // If no labels provided, select all text frames
        for (var i = 0; i < allFrames.length; i++) {
            if (allFrames[i] instanceof TextFrame) {
                labelledFrames.push(allFrames[i]);
            }
        }
    }
    UTILS.Log('Labels Extracted ' + labelledFrames.length)


    // Hyphenation for all paragraphs in the labelled frames
    if(labelledFrames.length == 0){
        UTILS.Log('No frames found')
        return
    }
    // Hyphenation for all paragraphs in the labelled frames
    for (var i = 0; i < labelledFrames.length; i++) {
        var textFrame = labelledFrames[i];
        var paragraphs = textFrame.paragraphs;
        UTILS.Log('TextFrame Label' + textFrame.label);
        for (var j = 0; j < paragraphs.length; j++) {
            var para = paragraphs[j];
            UTILS.Log('paragraph ' + j + 'hyphenation was ' + para.hyphenation);
            if(hyphenate===true){
                para.hyphenation = true;
            }
            else{
                para.hyphenation = false;
            }
            UTILS.Log('paragraph ' + j + 'hyphenation now ' + para.hyphenation);
        }
    }
    document.save();
};

/* Processes parameters and performs document operations */
function ProcessParams (parameters) {
    UTILS.Log('Processing parameters internal')
    var returnVal = {}

    // Open the target document
    var documentPath = UTILS.GetStringFromObject(parameters, KeyStrings.TargetDocument)
    documentPath = UTILS.GetFullPath(documentPath)

    UTILS.Log('Opening document')
    var tempTime = new Date().getTime()
    document = app.open(File(documentPath))
    timingObject[KeyStrings.TimeDocumentOpen] = (new Date()).getTime() - tempTime
    UTILS.Log('Opened document')

    // Relink assets and handle warnings
    tempTime = new Date().getTime()
    UTILS.UpdateDocumentLinks(document)
    timingObject[KeyStrings.TimeRelinkAssets] = (new Date()).getTime() - tempTime
    UTILS.Log('Updated links in the document')

    // Capturing top level errors and then clear errorList.
    UTILS.Log('Number of errors: ' + app.errorListErrors.count())
    if (app.errorListErrors.count() > 0) {
        warnings = handleWarnings(document)
    }
    app.clearAllErrors()
    UTILS.Log('Got the warnings from the document.')

    var outputPath = UTILS.GetStringFromObject(parameters, KeyStrings.OutputPath)
    outputPath = UTILS.GetFullPath(outputPath)

    tempTime = new Date().getTime()
    UTILS.UpdateDocumentLinks(document)

    var labels = parameters.labels
    var hyphenate = parameters.hyphenate

    // Calling the function to hyphenate the text frames
    hyphenation(document,labels,hyphenate);

    // Save the document as a new file.
    document.save(File(outputPath))

    timingObject[KeyStrings.TimeBalancing] = (new Date()).getTime() - tempTime

    // Add file to be uploaded as an output file.
    var relativePath = UTILS.GetRelativeReturnPath(outputPath)
    UTILS.AddAssetToBeUploaded(relativePath)

    returnVal.OutputPath = documentPath
    // Processing ends.

    return returnVal
}


/* Main function to execute the script */
function main () {

    var startTime = new Date().getTime() // Capture the script start time
    var returnObj = {} // Object to store return values
    var parameters = {} // Stores input parameters
    var tempTime
    var errorOccurred = false // Flag to track errors
    var data = {} // Stores processed data

    // Set application preferences
    app.clearAllErrors()
    app.serverSettings.useErrorList = true
    app.generalPreferences.pageNumbering = PageNumberingOptions.ABSOLUTE
    app.linkingPreferences.checkLinksAtOpen = true
    var previousUnit = app.scriptPreferences.measurementUnit
    app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS
  
    try {
        UTILS.InitiateLogging()
        UTILS.Log('Initiating logging.')
        
        // As a safe practice close any open documents before processing
        UTILS.CloseAllOpenDocuments()
  
        // Parse input parameters
        var input = app.scriptArgs.get('parameters')
        var allParameters = JSON.parse(input)

        UTILS.Log('Parsed job input : ' + input)
        parameters = allParameters.params
        if (parameters === undefined) {
            parameters = allParameters.input.params
        }

        // Check if parameters are valid
        if (parameters === undefined || typeof parameters !== 'object' || Array.isArray(parameters)) {
            UTILS.Log('No params found')
            UTILS.RaiseException(Errors.MissingParams)
        }

        // Set the working folder first. This is the directory within which all the input and output assets are to be managed.
        UTILS.SetWorkingFolder(UTILS.GetStringFromObject(allParameters, KeyStrings.WorkingFolder))
        UTILS.Log('Application: ' + app.name +', version:' + app.version)
        UTILS.Log('WorkingFolder: ' + UTILS.GetStringFromObject(allParameters, KeyStrings.WorkingFolder))
        UTILS.Log('JobID: ' + UTILS.GetStringFromObject(allParameters, KeyStrings.JobID))
        var result
        UTILS.Log('Processing Params')
        tempTime = new Date().getTime()

        // Process parameters and document
        result = ProcessParams(parameters)
        data[KeyStrings.ProcessedData] = result

        // Also add the log file
        UTILS.AddAssetToBeUploaded(UTILS.logFilePath);

        data.warnings = warnings
        // Processing ends.

        tempTime = new Date().getTime()
        if (document && document.isValid){
            document.close()
        }
        
        timingObject[KeyStrings.TimeDocumentClose] = (new Date()).getTime() - tempTime
        UTILS.Log('End of try')
    } catch (e) {
        var tempObj = {
        name: e.name,
        message: e.message,
        errorCode: e.number,
        isCustom: e.isCustom,
        line: e.line,
        fileName: e.fileName
        }
        
        UTILS.Log('Exception occurred', tempObj)
        errorOccurred = true

        // Failure, prepare the object to be returned.
        returnObj = UTILS.HandleError(tempObj)
    } finally {
        app.scriptPreferences.measurementUnit = previousUnit
        UTILS.Log('In finally')
        if (document && document.isValid) {

            // If Document is still open. Close it.
            UTILS.Log('Closing document')
            tempTime = new Date().getTime()
            document.close()
            timingObject[KeyStrings.TimeDocumentClose] = (new Date()).getTime() - tempTime
        }

        var elapsedTime = (new Date()).getTime() - startTime
        UTILS.Log('Time taken: ' + elapsedTime)
        timingObject[KeyStrings.TimeOverall] = elapsedTime
        UTILS.Log('Timing: ' + JSON.stringify(timingObject))
        data[KeyStrings.Timings] = timingObject

        if (!errorOccurred) {
            // Success, prepare the object to be returned.
            UTILS.Log('Finally: No error')
            returnObj = UTILS.GetSuccessReturnObj(data)
        }
        UTILS.Log('Final Result', JSON.stringify(returnObj))

        // Cleanup and Return
        UTILS.TerminateLogging()
        app.clearAllErrors()

        return UTILS.GetFinalReturnPackage(returnObj)
    }
}

// Execute the main function
main()
