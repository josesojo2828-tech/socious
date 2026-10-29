export default class PortfolioModel {
  MODEL_NAME = "Portfolio";

  getProfileFields() {
    return ["bio", "about", "services", "photoUrl", "socialLinks", "template", "config", "isPublic"];
  }

  getAvailableTemplates() {
    return ["default"];
  }
}
