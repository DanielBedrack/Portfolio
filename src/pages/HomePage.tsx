import { Footer } from '../components/layout/Footer'
import { Navigation } from '../components/layout/Navigation'
import { ContactSection } from '../components/sections/ContactSection'
import { EducationSection } from '../components/sections/EducationSection'
import { ExperienceSection } from '../components/sections/ExperienceSection'
import { FeaturedWork } from '../components/sections/FeaturedWork'
import { Hero } from '../components/sections/Hero'
import { ProcessSection } from '../components/sections/ProcessSection'
import { SkillsSection } from '../components/sections/SkillsSection'

export function HomePage() {
  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <FeaturedWork />
        <ProcessSection />
        <ExperienceSection />
        <SkillsSection />
        <EducationSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  )
}
