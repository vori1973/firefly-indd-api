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
// errors.jsx

// Error constants are defined here.
/*  This document list all the error which are possible from the scripts. The error object is built such that it has an error code and some error strings.
    The error strings are constructed in a way such that the first string is default and a string literal. It is to be returned anyhow. The subsequent strings can be
    strings having '^1' as placeholder replacement string. This replacement string can be replaced with relevant information. Based on the information
    available the final error message can be created.
*/
/* eslint-disable no-unused-vars */

var ErrorReplacementString = '^1'

var Errors = {
  // Errors during processing: 1001-1999
  InternalScriptError: {
    errorCode: 'internal_error',
    errorStrings: [
      'Internal script error. This should not had happened.'
    ]
  },
  ProcessingErrorOccurred: {
    errorCode: 'internal_error',
    errorStrings: [
      'Internal error: Error during processing.'
    ]
  },
  PDFPresetNotSet: {
    errorCode: 'capability_error',
    errorStrings: [
      'Capability error: No PDF Preset could be set.'
    ]
  },
  OutputDirError: {
    errorCode: 'internal_error',
    errorStrings: [
      'Internal error: Unable to create specified output directory.'
    ]
  },
  RelinkError: {
    errorCode: 'capability_error',
    errorStrings: [
      'Capability error: Unable to relink.',
      'Relink failed for ^1.'
    ]
  },
  PlaceError: {
    errorCode: 'capability_error',
    errorStrings: [
      'Capability error: Unable to place.',
      'Place failed for ^1.'
    ]
  },

  // Errors in input: 2001-2999
  ArrayExpected: {
    errorCode: 'parameter_error',
    errorStrings: [
      'Parameter error: Expected array ',
      'for property ^1.'
    ]
  },
  ParsingBoolError: {
    errorCode: 'parameter_error',
    errorStrings: [
      'Parameter error: Expected boolean ',
      '^1 is the provided value ',
      'for property ^1.'
    ]
  },
  ParsingIntError: {
    errorCode: 'parameter_error',
    errorStrings: [
      'Parameter error: Expected integer ',
      '^1 is the provided value ',
      'for property ^1.'
    ]
  },
  ParsingFloatError: {
    errorCode: 'parameter_error',
    errorStrings: [
      'Parameter error: Expected number ',
      '^1 is the provided value ',
      'for property ^1.'
    ]
  },
  ParsingStringError: {
    errorCode: 'parameter_error',
    errorStrings: [
      'Parameter error: Expected string ',
      '^1 is the provided value ',
      'for property ^1.'
    ]
  },
  OutOfBound: {
    errorCode: 'parameter_error',
    errorStrings: [
      'Parameter error: Incorrect range provided. ',
      'Culprit Value is ^1.'
    ]
  },
  MissingKey: {
    errorCode: 'parameter_error',
    errorStrings: [
      'Parameter error: Key not found in object. ',
      'Missing key is ^1.'
    ]
  },
  EnumError: {
    errorCode: 'parameter_error',
    errorStrings: [
      'Parameter error: No matching enum value found. ',
      '^1 is the provided value',
      'for property ^1.'
    ]
  },
  MissingParams: {
    errorCode: 'parameter_error',
    errorStrings: [
      'Parameter error: Either the \'params\' is not found in the request or it is not in the correct format.'
    ]
  },
  ObjectExpected: {
    errorCode: 'parameter_error',
    errorStrings: [
      'Parameter error: Expected object ',
      'for property ^1.'
    ]
  },
  AtLeastOneInternalParamShouldBePresent: {
    errorCode: 'parameter_error',
    errorStrings: [
      'Parameter error: At least one of the parameters should be present. ',
      'Missing parameters are ^1'
    ]
  },

  // Errors coming from IDS and sent under ProcessingErrorOccurred. These are specific errors which need string change while returning to the user.
  CannotOpenFileError: {
    errorCode: 'capability_error', // kCannotOpenFileError
    errorStrings: [
      'Capability error: Cannot open file.'
    ]
  }
}
