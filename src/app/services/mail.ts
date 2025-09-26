import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Mail {
  private readonly ACCESS_KEY = '0a7723c4-95d6-4d1f-9113-60122d037603'; // Replace with your Web3Forms public key

  constructor() {}

  sendEmail(data: any): Promise<Response> {
    const formData = new FormData();
    formData.append('access_key', this.ACCESS_KEY);
    formData.append('subject', 'Email Support From Your Site');
    formData.append('from_name', 'Contact Notification');
    
    // Append form fields
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });

    return fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData,
    });
  }
}
