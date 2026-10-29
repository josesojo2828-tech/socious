const BASE_URL = '/api/core';

export const CoreEndpoints = {
  actions: {
    // @Post('profile')
    // Nota: Requiere envío como 'multipart/form-data'
    // Campos necesarios en FormData: 
    // 1. 'profile' (el archivo)
    // 2. 'userId' (string)
    uploadProfileImage: `${BASE_URL}/api/profile`,
  }
};