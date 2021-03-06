import { Component, OnInit, ViewChild, ElementRef, Input, OnDestroy } from '@angular/core';
import { interval, timer, Subscription, Observable, Subject } from 'rxjs';
import { map, tap, retryWhen, delayWhen, filter, finalize } from 'rxjs/operators';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { NavController, Platform, ModalController, AlertController } from '@ionic/angular';
import { ModalCorridaService } from '../services/modal-corrida/modal-corrida.service';
import { RotaAtiva, RotaAtivaUpdate } from './rota-ativa-model';
import { IfStmt } from '@angular/compiler';
import { NotificationService } from '../shared/notification/notification.service';
import { LoadingService } from '../shared/loading/loading.service';
declare var google;

@Component({
  templateUrl: './mapa-motorista.page.html',
  styleUrls: ['./mapa-motorista.page.scss'],
})
export class MapaMotoristaPageComponent implements OnDestroy {
  @ViewChild('map') mapElement: ElementRef;
  map: any;
  public timer: Subscription = new Subscription();
  directionsService = new google.maps.DirectionsService();
  directionsDisplay = new google.maps.DirectionsRenderer();
  currentPositionDriver: any;
  originPosition: string;
  destinationPositionDriver = 'FATEC - Praça 19 de Janeiro - Boqueirão, Praia Grande - SP, Brasil';

  @Input() rotaAtiva: RotaAtiva;

  rotasCadastradas;
  latitudeAtual: string;
  longitudeAtual: string;
  positionSubscription: Subscription;
  motoristaMarcador: any;

  showModalObservable: Observable<boolean>;
  tracking: boolean;
  atualizarPosicaoObservable: Subscription;
  marcadorCarona: any;

  constructor(
    private geolocation: Geolocation,
    public navCtrl: NavController,
    public modalController: ModalController,
    private modalCorridaService: ModalCorridaService,
    public notificationService: NotificationService,
    public loadingService: LoadingService,
    public alertController: AlertController
  ) { }

  ionViewDidEnter() {
    this.setMap();
  }

  setMap() {
    const mapOptions = {
      zoom: 8,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    };

    this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);
    this.directionsDisplay.setMap(this.map);

    this.geolocation.getCurrentPosition().then(pos => {
      const latLng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
      this.map.setCenter(latLng);
      this.map.setZoom(8);


      this.destinationPositionDriver = this.rotaAtiva.pontoFinal;

      // if motorista current position trackeia a rota
      if (this.rotaAtiva.isMotorista) {
        this.setMapDriverView(latLng);
        this.atualizarPosicaoAtual();
      } else {
        this.startTrakingUser(latLng);
        this.setMapDriverView(this.rotaAtiva.latLng);
      }


    }).catch((error) => {
      console.log('Error getting location', error);
    }).finally(() => {
      this.startTracking();
    });


  }


  dismiss() {
    this.modalCorridaService.mostrarCorridaAtivaMotorista.emit(false);
    this.atualizarPosicaoObservable?.unsubscribe();
    this.stopTracking();
  }

  finalizarRotaEmAndamento() {

    this.loadingService.showLoading('Finalizando corrida...', false);
    this.modalCorridaService.finalizarViagemEmAndamento(this.rotaAtiva.idViagem,
      new RotaAtivaUpdate(this.rotaAtiva.id, this.rotaAtiva.latLng))
      .pipe(finalize(() => {
        this.loadingService.hideLoading();
      }))
      .subscribe(result => {
        this.notificationService.notificarSucesso('Corrida finalizada com sucesso');
        this.stopTracking();
        this.dismiss();
      });
  }



  startTracking() {

    this.tracking = true;
    this.positionSubscription = this.geolocation.watchPosition()
      .pipe(
        filter((p) => p.coords !== undefined)
      )
      .subscribe(data => {
        setTimeout(() => {
          const latLng = this.currentPositionDriver = new google.maps.LatLng(data.coords.latitude, data.coords.longitude);

          this.destinationPositionDriver = this.rotaAtiva.pontoFinal;

          // if motorista current position trackeia a rota
          if (this.rotaAtiva.isMotorista) {
            this.setMapDriverView(latLng);
          } else {
            this.startTrakingUser(latLng);
            this.setMapDriverView(this.rotaAtiva.latLng);
          }

        }, 0);
      });

  }


  setMapDriverView(latLng: string) {
    this.currentPositionDriver = latLng;
    this.calculateRoute();
    this.modalCorridaService.atualizarRotaEmAndamento(
      this.rotaAtiva.idViagem,
      new RotaAtivaUpdate(this.rotaAtiva.id, latLng));
  }


  setMapDriverForViewUser() {
    this.modalCorridaService.buscarRotasEmAdamentoUsuario()
      .pipe(finalize(() => {
        this.calculateRoute();
      }))
      .subscribe(result => {
        this.currentPositionDriver = result.data.latLng;

      });

  }

  startTrakingUser(latLng: string) {
    if (this.marcadorCarona)
      this.marcadorCarona.setMap(null);

    this.marcadorCarona = new google.maps.Marker({
      position: latLng,
      map: this.map
    });

    this.marcadorCarona.setMap(this.map);
    this.currentPositionDriver = this.rotaAtiva.latLng;
    this.destinationPositionDriver = this.rotaAtiva.pontoFinal;

  }

  calculateRoute() {
    if (this.destinationPositionDriver && this.currentPositionDriver) {

      const request = {
        // Pode ser uma coordenada (LatLng), uma string ou um lugar
        origin: this.currentPositionDriver,
        destination: this.destinationPositionDriver,
        travelMode: 'DRIVING'
      };

      this.traceRoute(this.directionsService, this.directionsDisplay, request);
    }
  }

  traceRoute(service: any, display: any, request: any) {
    service.route(request, function (result, status) {
      if (status === 'OK') {
        display.setDirections(result);
      }
    });
  }


  stopTracking() {
    if (!this.tracking)
      return;

    this.tracking = false;
    this.positionSubscription?.unsubscribe();

  }


  atualizarPosicaoAtual() {
    this.atualizarPosicaoObservable = Observable.create(() => {
      setInterval(() => {
        console.log('Atualizara posicao')
        const storagePosition = localStorage.getItem('previousRota');

        if (String(this.currentPositionDriver) !== storagePosition) {
          this.modalCorridaService.atualizarRotaEmAndamento(
            this.rotaAtiva.idViagem,
            new RotaAtivaUpdate(this.rotaAtiva.id, JSON.stringify(this.currentPositionDriver)))
            .subscribe();

          localStorage.setItem('previousRota', this.currentPositionDriver);
        }
      }, 30000);
    }).subscribe();
  }

  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Confirm!',
      message: '<strong>Deseja finalizar esta corrida?</strong>!!!',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
            console.log('Confirm Cancel: blah');
          }
        }, {
          text: 'Finalizar',
          handler: () => {
            this.finalizarRotaEmAndamento();
          }
        }
      ]
    });

    await alert.present();
  }


  ngOnDestroy(): void {
    this.atualizarPosicaoObservable?.unsubscribe();
  }
}


