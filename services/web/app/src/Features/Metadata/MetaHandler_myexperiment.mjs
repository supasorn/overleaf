import ProjectEntityHandler from '../Project/ProjectEntityHandler.js'
import DocumentUpdaterHandler from '../DocumentUpdater/DocumentUpdaterHandler.js'
import packageMapping from './packageMapping.mjs'
import { callbackify } from '@overleaf/promise-utils'
import BibtexParser from '../../util/bib2json.js'

/** @typedef {{
 *   labels: string[]
 *   packages: Record<string, Record<string, any>>,
 *   packageNames: string[],
 * }} DocMeta
 */

/**
 * @param {string[]} lines
 * @return {Promise<DocMeta>}
 */
async function extractMetaFromDoc(lines) {
  /** @type {DocMeta} */
  const docMeta = {
    labels: [],
    packages: {},
    packageNames: [],
    referenceKeys: [],
  }

  const labelRe = /\\label{(.{0,80}?)}/g
  const packageRe = /^\\usepackage(?:\[.{0,80}?])?{(.{0,80}?)}/g
  const reqPackageRe = /^\\RequirePackage(?:\[.{0,80}?])?{(.{0,80}?)}/g

  for (const rawLine of lines) {
    const line = getNonCommentedContent(rawLine)

    for (const pkg of lineMatches(labelRe, line)) {
      docMeta.labels.push(pkg)
    }

    for (const pkg of lineMatches(packageRe, line, ',')) {
      docMeta.packageNames.push(pkg)
    }

    for (const pkg of lineMatches(reqPackageRe, line, ',')) {
      docMeta.packageNames.push(pkg)
    }
  }

  for (const packageName of docMeta.packageNames) {
    if (packageMapping[packageName]) {
      docMeta.packages[packageName] = packageMapping[packageName]
    }
  }

  // parse bib
  const bibContent = lines.join('\n')
  const { entries, errors } = BibtexParser(bibContent)

  for (const entry of entries) {
    docMeta.referenceKeys.push(entry.EntryKey + "-" + entry.Fields.title)
  }

  return docMeta
}

/**
 * @param {string[]} lines
 * @return {Promise<DocMeta>}
 */
async function extractMetaFromBib(lines) {
  const bibContent = lines.join('\n')
  const { entries, errors } = BibtexParser(bibContent)

  if (errors.length > 0) {
    throw new Error(`BibTeX parsing errors: ${errors.join(', ')}`)
  }

  const docMeta = {
    labels: [],
    packages: {},
    packageNames: [],
    referenceKeys: [],
    // bibEntries: entries,
  }

  for (const entry of entries) {
    docMeta.referenceKeys.push(entry.EntryKey + "-" + entry.Fields.title)
  }

  return docMeta
}


/**
 *
 * @param {RegExp} matchRe
 * @param {string} line
 * @param {string} [separator]
 * @return {Generator<string>}
 */
function* lineMatches(matchRe, line, separator) {
  let match
  while ((match = matchRe.exec(line))) {
    const matched = match[1].trim()

    if (matched) {
      if (separator) {
        const items = matched
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)

        for (const item of items) {
          yield item
        }
      } else {
        yield matched
      }
    }
  }
}

/**
 * @param {Record<{ lines: string[] }, any>} projectDocs
 * @return {Promise<{}>}
 */
async function extractMetaFromProjectDocs(projectDocs) {
  const projectMeta = {}
  for (const doc of Object.values(projectDocs)) {
    // if (doc.name.endsWith('.bib')) {
      // projectMeta[doc._id] = await extractMetaFromBib(doc.lines)
    // } else {
    projectMeta[doc._id] = await extractMetaFromDoc(doc.lines)
    // }
  }
  return projectMeta
}

/**
 * Trims comment content from line
 * @param {string} rawLine
 * @returns {string}
 */
function getNonCommentedContent(rawLine) {
  return rawLine.replace(/(^|[^\\])%.*/, '$1')
}

async function getAllMetaForProject(projectId) {
  await DocumentUpdaterHandler.promises.flushProjectToMongo(projectId)

  const docs = await ProjectEntityHandler.promises.getAllDocs(projectId)
  console.log("\n\ngetAllMetaForProject:::", docs);

  return await extractMetaFromProjectDocs(docs)
}

async function getMetaForDoc(projectId, docId) {
  await DocumentUpdaterHandler.promises.flushDocToMongo(projectId, docId)

  const { lines } = await ProjectEntityHandler.promises.getDoc(projectId, docId)
  console.log("**************************", docId, lines);

  return await extractMetaFromDoc(lines)
}

export default {
  promises: {
    getAllMetaForProject,
    getMetaForDoc,
  },
  getAllMetaForProject: callbackify(getAllMetaForProject),
  getMetaForDoc: callbackify(getMetaForDoc),
}
