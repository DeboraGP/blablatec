import { Component, OnInit, SystemJsNgModuleLoaderConfig } from '@angular/core';
import { NavController, AlertController, LoadingController } from '@ionic/angular';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';

import { UserService } from '../services/user/user.service';
import { cordovaPropertySet } from '@ionic-native/core';
import { finalize } from 'rxjs/operators';
import { NotificationService } from '../shared/notification/notification.service';
import { LoadingService } from '../shared/loading/loading.service';

@Component({
  selector: 'app-cadastrar',
  templateUrl: './cadastrar.page.html',
  styleUrls: ['./cadastrar.page.scss'],
})
export class CadastrarPage implements OnInit {
  usuario = {
    Nome: '',
    Email: '',
    Senha: '',
    ConfirmacaoSenha: '',
    Ra: '',
    numeroTelefone: '',
    Modelo: '',
    Placa: '',
    Corcarro: '',
    Sobrenome: '',
    motorista: false,

    ConcordaComTermos: false,
  };

  nome = new FormControl('', [Validators.required]);
  email = new FormControl('', [Validators.email]);
  senha = new FormControl('', [Validators.required]);
  confirmacaoSenha = new FormControl('', [Validators.required]);
  ra = new FormControl('', [Validators.required]);
  numeroTelefone = new FormControl('', [Validators.required]);
  modelo = new FormControl('', []);
  placa = new FormControl('', []);
  corcarro = new FormControl('', []);
  sobrenome = new FormControl('', [Validators.required]);
  motorista = new FormControl(false, []);
  cordaComTermos = new FormControl(false, [Validators.required]);
  grupo = new FormControl('', [Validators.required]);

  form: FormGroup;

  public escolha: string;




  constructor(
    private userService: UserService,
    private alertController: AlertController,
    private navCtrl: NavController,
    private formBuilder: FormBuilder,
    private loadingService: LoadingService,
    private notificarionService: NotificationService
  ) { }
  ngOnInit() {

    this.form = this.formBuilder.group({
      nome: this.nome,
      email: this.email,
      senha: this.senha,
      confirmacaoSenha: this.confirmacaoSenha,
      ra: this.ra,
      numeroTelefone: this.numeroTelefone,
      modelo: this.modelo,
      placa: this.placa,
      corcarro: this.corcarro,
      sobrenome: this.sobrenome,
      motorista: this.motorista,
      cordaComTermos: this.cordaComTermos,
      grupo: this.grupo,
    });
  }

  async finalizarCadastro() {


    if (!this.verificarSenha()) {
      this.notificarionService.notificarInfo('A confirmação de senha está diferente da senha digitada.');
      return;
    } else {

      if (this.form.controls.cordaComTermos.value) {
        await this.loadingService.showLoading();

        this.form.controls.motorista.patchValue('perfilMotorista' ? true : false);
        if (this.form.value.grupo === 'perfilCarona') {
          this.form.value.motorista = false;
        }
        else {
          this.form.value.motorista = true;
        }

        console.log(this.form.value);
        this.userService.cadastrarUsuario(this.form.value)
          .pipe(finalize(async () => await this.loadingService.hideLoading()))
          .subscribe(
            (data) => {
              this.notificarionService.notificarSucesso('Usuário cadastrado com sucesso');
              this.home();
            },
          );
      } else {
        this.notificarionService.notificarInfo('Para realizar o cadastro, você deve concordar com nossos termos de uso.');
        return;
      }
    }
  }

  verificarSenha() {
    if (this.usuario.Senha !== this.usuario.ConfirmacaoSenha) {
      return false;
    } else {
      return true;
    }
  }

  home(): void {
    this.navCtrl.navigateRoot('home');
  }

}
