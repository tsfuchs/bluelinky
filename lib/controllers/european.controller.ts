import { BlueLinkyConfig } from './../interfaces/common.interfaces';
// import fetch from 'node-fetch';
import got from 'got';
import * as https from "https";
import { ALL_ENDPOINTS } from '../constants';
import { Logger } from 'winston';
import { Vehicle } from '../vehicles/vehicle';
import EuropeanVehicle from '../vehicles/europianVehicle';
import logger from '../logger';

export class EuropeanController {

  constructor(private logger: Logger){
    logger.info(`${this.config.region} Controller created`);
  }

  public accessToken: string = '';
  public deviceId: string = 'c0e238b4-c0de-488c-9eee-caa6c74035a1';

  public config: BlueLinkyConfig = {
    username: null,
    password: null,
    region: 'EU',
    autoLogin: true
  };

  async login() {
    return new Promise<string>(async (resolve, reject) => {
      let CookieHeader = '';

      try {
        await new Promise((_resolve, reject) => {
          https.get(ALL_ENDPOINTS.EU.session, res => {
            if (res.headers['set-cookie'] !== undefined) {
              CookieHeader = res.headers['set-cookie'][0] + ';' + res.headers['set-cookie'][1];
              _resolve(CookieHeader);
            }
          });
        });

        const authCodeResponse = await got(ALL_ENDPOINTS.EU.login, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': CookieHeader
          },
          json: true,
          body: {
            email: this.config.username,
            password: this.config.password
          }
        });

        const authCode = authCodeResponse.body.redirectUrl.split('?')[1].split('&')[0].split('=')[1];
        // logger.debug('Got auth code: ' + authCode);

        const formData = new URLSearchParams();
        formData.append('grant_type', 'authorization_code');
        formData.append('redirect_uri', ALL_ENDPOINTS.EU.redirect_uri);
        formData.append('code', authCode);

        const response = await got(ALL_ENDPOINTS.EU.token, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic NmQ0NzdjMzgtM2NhNC00Y2YzLTk1NTctMmExOTI5YTk0NjU0OktVeTQ5WHhQekxwTHVvSzB4aEJDNzdXNlZYaG10UVI5aVFobUlGampvWTRJcHhzVg==',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length':'154',
            'Host': 'prd.eu-ccapi.hyundai.com:8080',
            'Connection':'Keep-Alive',
            'Accept-Encoding':'gzip',
            'User-Agent': 'okhttp/3.10.0',
            'grant_type': 'authorization_code'
          },
          body: formData.toString(),
        });

        this.accessToken = JSON.parse(response.body).access_token;
        resolve('Login success');
        // logger.debug(JSON.stringify(response.body));
      } catch (err) {
        this.logger.debug(JSON.stringify(err.message));
        reject(err.message);
      }
    });
  }

  logout() {
    return 'OK';
  }

  async getVehicles(): Promise<Array<Vehicle>> {
    return new Promise((resolve, reject) => {
        if(this.accessToken !== undefined){
            fetch('https://prd.eu-ccapi.hyundai.com:8080/api/v1/spa/vehicles', {
            method: 'get',
            headers: {
                'Authorization': this.accessToken,
                'ccsp-device-id': this.deviceId
            },
        }).then((result: Response) => {
            result.json().then(vehicles => {
                const euv: Array<EuropeanVehicle> = vehicles.resMsg.vehicles;
                const result: Array<Vehicle> = [];
                euv.forEach((_euv: EuropeanVehicle) => {
                  result.push(new Vehicle(_euv));
                });
                resolve(result);
            });
        });
        } else {
            reject('Token not set');
        }
    })
  }
}
