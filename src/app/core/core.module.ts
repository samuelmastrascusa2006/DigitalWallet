import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';


@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  exports: []
})
export class CoreModule {
  /**
   * Previene que el CoreModule sea importado más de una vez.
   * Solo debe importarse en AppModule.
   */
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error(
        'CoreModule ya fue cargado. Importa CoreModule únicamente en AppModule.'
      );
    }
  }
}
