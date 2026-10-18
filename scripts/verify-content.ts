import { profile } from '../src/content/profile'
import { projects } from '../src/content/projects'
import { validatePortfolioContent } from '../src/content/validateContent'

const errors = validatePortfolioContent(projects, profile)

if (errors.length > 0) {
  console.error(`Portfolio content validation failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(`Portfolio content validation passed: ${projects.length} projects, 0 errors.`)
}
